# Currency

Each price is stored as hundredths plus the currency it was entered in. Existing rows are backfilled to USD. Changing the currency in Settings does not rewrite those rows and does not convert them. A new price, or a price you edit, is stored in the currency selected at that moment.

The currency setting lives in More, then Settings. It starts from the device locale (`Intl.DateTimeFormat`) and falls back to USD. `expo-localization` is not installed. It is a native module, so adding it needs a new iOS and Android build. The locale Intl already reports works over the air.

The choice is saved on the device and, when you are signed in, on the account (`users.currency`, migration `0009_currency.sql`). The device sends it with the rest of the profile. Subscription prices for Stack Pro stay in US dollars. They are the price of the app, not a price you entered.

Discover cards do not show a price. A copied product is added with no price, so you enter what you pay. The public page and both preview images show the monthly total in the currencies it was entered in, for example "£175 a month" or "£40 a month and $12 a month". They do not show each bottle's price. Individual prices, notes, and start dates stay on the phone.

The example catalogue amounts were written as dollar figures. Loading example data stores those amounts in the currency selected on the device at that moment. It does not convert them.
