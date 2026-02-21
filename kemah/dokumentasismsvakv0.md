# API MORESMS.NET (vak-sms.com)

All requests are sent using a GET request to the address `https://moresms.net`
Each request must contain an API key, which can be found in the account settings.
**Your apiKey:** `3818301248284ef786158ceafabd2890`

---

## 1. User Balance (in rubles)

**URL parameters**
- `apiKey` (string, required): API ключ доступа

**Request:**
`GET https://moresms.net/api/getBalance/?apiKey={apiKey} HTTP/1.1`

**Response:**
```json
{"balance": 100.0}
```

---

## 2. Количество доступных номеров (Get Count & Price)

**URL parameters**
- `service` (string, required): Code of the site, service, social network
- `country` (string, default=`ru`): Код страны номера телефона
- `operator` (string, default=`None`): Operator name
- `price` (string, default=`None`): Цена за номер

**Request:**
`GET https://moresms.net/api/getCountNumber/?apiKey={apiKey}&service={service}&country={country}&operator={operator}&price HTTP/1.1`

**Response (Count only):**
```json
{"{SERVICE}": 332}
```

**Response (With price):**
```json
{"{SERVICE}": 332, "price": 2.0}
```

---

## 3. List of available countries with operators

**Request:**
`GET https://moresms.net/api/getCountryList/ HTTP/1.1`

**Response:**
```json
[
  {"countryName": "France", "countryCode": "fr", "operatorList": ["any", "lycamobile", "lebara"]},
  {"countryName": "United Kingdom", "countryCode": "gb", "operatorList": ["any", "vodafone", "three", "tmobile", "o2", "ee", "lycamobile"]}
]
```

---

## 4. Получение номера (Get Number)

**URL parameters**
- `apiKey` (string, required): API access key
- `service` (string, required): Code of the site/service
- `rent` (bool, default=`false`): When rent=true, a rental number is issued for 4 hours.
- `country` (string, default=`ru`): Country code
- `operator` (string, default=`None`): Operator name
- `softId` (int, default=`None`): Software number for receiving commissions

**Request (Single service):**
`GET https://moresms.net/api/getNumber/?apiKey={apiKey}&service={service}&country={country}&operator={operator}&softId={softId} HTTP/1.1`

**Response:**
```json
{"tel": 79991112233, "idNum": "3adb61376b8f4adb90d6e758cf8084fd"}
```

**Request (Multiple services):**
Multiple services separated by comma: `service={service},{service}`.
**Response:**
```json
[
  {"tel": 79221112233, "service": "wa", "idNum": "cdab00fc70ed4991b88217c21cecac8b"}, 
  {"tel": 79221112233, "service": "vi", "idNum": "aff42ce77a9245d7a1f1c0da65d8b8cd"}
]
```

---

## 5. Продление полученного ранее номера (Prolong Number)

**URL parameters**
- `apiKey` (string, required)
- `service` (string, required)
- `tel` (string, required): Phone number to which the code was previously received.

**Request:**
`GET https://moresms.net/api/prolongNumber/?apiKey={apiKey}&service={service}&tel={tel} HTTP/1.1`

**Response:**
```json
{"tel": 79991112233, "idNum": "3adb61376b8f4adb90d6e758cf8084fd"}
```

---

## 6. Status change (Set Status)

**URL parameters**
- `apiKey` (string, required)
- `idNum` (string, required): Operation ID
- `status` (string, required): 
  - `send` - Another SMS
  - `end` - Cancel number
  - `bad` - Number already used, banned

**Request:**
`GET https://moresms.net/api/setStatus/?apiKey={apiKey}&status={status}&idNum={idNum} HTTP/1.1`

**Response (status=send):**
```json
{"status": "ready"}
```

**Response (status=end):**
- `{"status": "smsReceived"}` (SMS received, cancellation impossible)
- `{"status": "waitSMS"}` (SMS sent, cancellation impossible. Wait for code)
- `{"status": "update"}` (Status updated / Cancelled)

**Response (status=bad):**
- `{"status": "update"}` (Successfully updated/banned)
- `{"status": "waitSMS"}` (Cannot be updated because service is waiting for repeat SMS)

---

## 7. Состояние активации (Get SMS Code)

**URL parameters**
- `apiKey` (string, required)
- `idNum` (string, required): Operation ID
- `all` (boolean, default=`None`): Retrieve the entire list of received codes.

**Request:**
`GET https://moresms.net/api/getSmsCode/?apiKey={apiKey}&idNum={idNum}&all HTTP/1.1`

**Response:**
- `{"smsCode": null}` (Waiting for SMS)
- `{"smsCode": "CODE"}` (Code received)

**Response (with all):**
```json
{"smsCode": ["CODE1", "CODE2"]}
```

---

## Error options

- `{"error": "apiKeyNotFound"}`: Неверный API ключ.
- `{"error": "noService"}`: This service is not supported.
- `{"error": "noNumber"}`: No numbers available, try again later.
- `{"error": "noMoney"}`: Недостаточно средств, пополните баланс.
- `{"error": "noCountry"}`: The requested country is not available.
- `{"error": "noOperator"}`: Operator not found for the requested country.
- `{"error": "badStatus"}`: Invalid status.
- `{"error": "idNumNotFound"}`: Не верный ID операции.
- `{"error": "badService"}`: Invalid site/service code.
- `{"error": "badData"}`: Отправлены неверные данные.
