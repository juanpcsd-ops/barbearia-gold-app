# Barbearia Gold — APK de demonstração

O workflow GitHub Actions `Android APK - Barbearia Gold Demo` gera um APK **debug** de demonstração a partir do site estático usando Capacitor.

## Como obter o APK
1. Abra a aba **Actions** do repositório no GitHub.
2. Selecione **Android APK - Barbearia Gold Demo**.
3. Abra a execução mais recente e aguarde o sinal verde.
4. Em **Artifacts**, baixe `Barbearia-Gold-Demo-Android`.
5. Extraia o ZIP; dentro estará `app-debug.apk`. Instale no Android apenas se confiar na origem.

Se não houver execução automática, use **Run workflow** na página do workflow. Se o GitHub solicitar habilitar Actions, habilite para este repositório.

## Limitações
- Aplicativo de demonstração, não pronto para Play Store.
- Reservas são simuladas e gravadas localmente no aparelho.
- Pix desativado; painel administrativo não possui autenticação de produção.
- O APK debug é assinado com chave de teste, não com uma chave de publicação.
- Imagens ilustrativas externas exigem internet.
- Não usar com dados reais de clientes.
