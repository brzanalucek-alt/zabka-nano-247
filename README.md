# ŻABKA NANO 24/7 — paczka wdrożeniowa

Ta paczka zawiera stronę sklepu, Cloudflare Worker, panel administratora i obsługę przycisku Mini App w Telegramie.

## Co zostało dopasowane
- Worker i strona korzystają z jednego dokumentu `zabka_store`.
- `setup.sql` przenosi istniejące aktywne rekordy z tabeli `public.products` do `zabka_store` (kolumny `id`, `name`, `price`, `description`, `image_url`, `is_active`, `sort_order`).
- Zatwierdzone opinie z `public.reviews` są przenoszone do formatu sklepu.
- Skrypt nie usuwa ani nie modyfikuje tabel `products`, `reviews`, `store_settings`, `admin_users` i nie nadpisuje istniejącego rekordu `zabka_store`.
- Nazwa Workera w `wrangler.toml` to `zabkanano247`, zgodna z dotychczasowym adresem `zabkanano247.wroclawvending.workers.dev`.

## Ważne przed wdrożeniem
1. Zrób kopię obecnej wersji Workera w Cloudflare.
2. Nie publikuj `service_role` key ani tokenu Telegram w plikach strony.
3. W Supabase uruchom `setup.sql` w SQL Editor. Skrypt zachowuje dotychczasowe tabele i produkty.
4. W Cloudflare ustaw sekrety Workera: `BOT_TOKEN`, `ADMIN_PASSWORD`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_WEBHOOK_SECRET`.
5. Wdróż pliki z katalogu projektu. Wdrożenie wymaga Cloudflare Wrangler (Node.js) lub obsługi wdrożenia Worker + Assets; sam ZIP nie wdraża się automatycznie po przesłaniu do panelu.
6. Po wdrożeniu ustaw webhook Telegrama na `https://zabkanano247.wroclawvending.workers.dev/telegram`, z nagłówkowym sekretem `TELEGRAM_WEBHOOK_SECRET`.

## Wdrożenie przez Wrangler
W katalogu `zabka_work`:

```bash
npx wrangler login
npx wrangler secret put BOT_TOKEN
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler deploy
```

Wartości sekretów wpisuj w terminalu Cloudflare/Wrangler, nigdy do `public/` ani do plików wysyłanych klientom.

## Panel administratora
Po wdrożeniu: `https://zabkanano247.wroclawvending.workers.dev/?admin=1`.
Panel wymaga hasła ustawionego jako sekret `ADMIN_PASSWORD`.

## Ograniczenia obecnej wersji
Koszyk i formularz dostawy są demonstracyjne — nie realizują prawdziwych zamówień ani płatności. Przykładowe opinie nie są autentycznymi recenzjami.
