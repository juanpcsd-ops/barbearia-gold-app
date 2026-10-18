import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Configure JWT_SECRET com 32+ caracteres');
const db = new Database(process.env.DB_PATH || './gold.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('client','admin')));
CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY,name TEXT NOT NULL,minutes INTEGER NOT NULL,price_cents INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS professionals(id INTEGER PRIMARY KEY,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),service_id INTEGER NOT NULL REFERENCES services(id),professional_id INTEGER NOT NULL REFERENCES professionals(id),start_at TEXT NOT NULL,end_at TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','confirmed','cancelled')) DEFAULT 'pending',created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bookings_pro_time ON bookings(professional_id,start_at,end_at);
`);
const initial=[['Cabelo',30,4000],['Barba',20,2000],['Bigode',5,500],['Sobrancelha',5,500],['Cabelo infantil',30,4000],['Cabelo + barba',50,6000],['Cabelo + sobrancelha',40,4500],['Combo completo (confirmar nome)',50,6500],['Cabelo + pigmentação (confirmar nome)',60,8500],['Luzes',120,7000],['Pintar',30,2000],['Relaxamento',20,2000]];
if (!db.prepare('SELECT 1 FROM services LIMIT 1').get()) {const ins=db.prepare('INSERT INTO services(name,minutes,price_cents) VALUES(?,?,?)');db.transaction(()=>initial.forEach(x=>ins.run(...x)))();}
if (!db.prepare('SELECT 1 FROM professionals LIMIT 1').get()) db.prepare('INSERT INTO professionals(name) VALUES(?)').run('Magdiel');
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
 const email=process.env.ADMIN_EMAIL.toLowerCase().trim();
 if(!db.prepare('SELECT id FROM users WHERE email=?').get(email)) db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(randomUUID(),'Administrador',email,bcrypt.hashSync(process.env.ADMIN_PASSWORD,12),'admin');
}
const app=express();app.use(helmet());app.use(express.json({limit:'20kb'}));app.use(rateLimit({windowMs:15*60*1000,limit:150}));
app.use((req,res,next)=>{const origin=process.env.CORS_ORIGIN;if(origin&&req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');}if(req.method==='OPTIONS')return res.sendStatus(204);next();});
const auth=(roles=[]) => (req,res,next)=>{try{const token=(req.headers.authorization||'').replace(/^Bearer /,'');const payload=jwt.verify(token,process.env.JWT_SECRET);if(roles.length&&!roles.includes(payload.role))return res.sendStatus(403);req.user=payload;next();}catch{return res.sendStatus(401);}};
const issue=u=>jwt.sign({sub:u.id,role:u.role},process.env.JWT_SECRET,{expiresIn:'12h'});
const register=z.object({name:z.string().trim().min(2).max(100),email:z.string().email().max(200),password:z.string().min(10).max(128)});
app.post('/api/register',(req,res)=>{const p=register.safeParse(req.body);if(!p.success)return res.status(400).json({error:'Dados inválidos'});const {name,password}=p.data,email=p.data.email.toLowerCase().trim();try{const id=randomUUID();db.prepare("INSERT INTO users VALUES(?,?,?,?, 'client')").run(id,name,email,bcrypt.hashSync(password,12));res.status(201).json({token:issue({id,role:'client'})});}catch{return res.status(409).json({error:'E-mail já cadastrado'});}});
app.post('/api/login',(req,res)=>{const p=z.object({email:z.string().email(),password:z.string()}).safeParse(req.body);if(!p.success)return res.sendStatus(400);const u=db.prepare('SELECT * FROM users WHERE email=?').get(p.data.email.toLowerCase().trim());if(!u||!bcrypt.compareSync(p.data.password,u.password_hash))return res.status(401).json({error:'Credenciais inválidas'});res.json({token:issue(u),role:u.role});});
app.get('/api/services',(_,res)=>res.json(db.prepare('SELECT * FROM services WHERE active=1').all()));
app.get('/api/professionals',(_,res)=>res.json(db.prepare('SELECT * FROM professionals WHERE active=1').all()));
function localMinutes(iso){const d=new Date(iso);return d.getUTCHours()*60+d.getUTCMinutes();}
const bookingSchema=z.object({service_id:z.number().int().positive(),professional_id:z.number().int().positive(),start_at:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-03:00$/)});
const createBooking=db.transaction((user,p)=>{
 const service=db.prepare('SELECT * FROM services WHERE id=? AND active=1').get(p.service_id);
 const professional=db.prepare('SELECT * FROM professionals WHERE id=? AND active=1').get(p.professional_id);
 if(!service||!professional)throw Error('Serviço ou profissional indisponível');
 const start=new Date(p.start_at);if(!Number.isFinite(start.getTime())||start<=new Date())throw Error('Data inválida');
 const brazil=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(start);
 const v=Object.fromEntries(brazil.map(x=>[x.type,x.value]));const day=v.weekday,mins=Number(v.hour)*60+Number(v.minute);
 const open=day==='Mon'?810:day==='Sat'?570:780,close=day==='Sat'?1320:1200;
 if(day==='Sun'||mins<open||mins+service.minutes>close)throw Error('Fora do expediente');
 const end=new Date(start.getTime()+service.minutes*60000);
 const overlap=db.prepare("SELECT 1 FROM bookings WHERE professional_id=? AND status IN ('pending','confirmed') AND start_at < ? AND end_at > ? LIMIT 1").get(p.professional_id,end.toISOString(),start.toISOString());
 if(overlap)throw Error('Horário ocupado');
 const id=randomUUID();db.prepare('INSERT INTO bookings VALUES(?,?,?,?,?,?,?,?)').run(id,user,p.service_id,p.professional_id,start.toISOString(),end.toISOString(),'pending',new Date().toISOString());
 return {id,status:'pending'};
});
app.post('/api/bookings',auth(['client','admin']),(req,res)=>{const p=bookingSchema.safeParse(req.body);if(!p.success)return res.sendStatus(400);try{res.status(201).json(createBooking(req.user.sub,p.data));}catch(e){res.status(409).json({error:e.message});}});
app.get('/api/bookings/mine',auth(),(req,res)=>res.json(db.prepare('SELECT * FROM bookings WHERE user_id=? ORDER BY start_at DESC').all(req.user.sub)));
app.get('/api/admin/bookings',auth(['admin']),(_,res)=>res.json(db.prepare('SELECT b.*,u.name AS client_name,s.name AS service_name,p.name AS professional_name FROM bookings b JOIN users u ON u.id=b.user_id JOIN services s ON s.id=b.service_id JOIN professionals p ON p.id=b.professional_id ORDER BY start_at DESC LIMIT 500').all()));
app.patch('/api/admin/bookings/:id',auth(['admin']),(req,res)=>{const p=z.object({status:z.enum(['confirmed','cancelled'])}).safeParse(req.body);if(!p.success)return res.sendStatus(400);const result=db.prepare('UPDATE bookings SET status=? WHERE id=?').run(p.data.status,req.params.id);res.sendStatus(result.changes?204:404);});
app.get('/health',(_,res)=>res.json({ok:true,pix:'not-configured'}));
app.listen(Number(process.env.PORT||3000),()=>console.log('Barbearia Gold API ready'));
