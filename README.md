# 📄 YouTube Transcript Service (Node.js)

A robust **Node.js (TypeScript)** microservice designed to extract full transcripts from YouTube videos.

This service is specifically engineered to run in Datacenter environments (such as **Coolify**, AWS, DigitalOcean) by bypassing YouTube's IP blocking mechanisms through native **Residential Proxy** support.

![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)

## 🚀 Features

*   **Block Bypass:** Native support for Residential Proxies via `undici` to avoid 429 errors or GDPR consent loops.
*   **Robust Extraction:** Uses `youtube-transcript-plus` with custom fetch injection.
*   **Security:** Authentication via API Key (Header) and Rate Limiting.
*   **Structured Logs:** JSON formatted logs ready for observability tools.
*   **Semantic Error Handling:** Proper HTTP status codes (404 for missing video, 502 for proxy errors, etc.).
*   **n8n Ready:** Response format optimized for automation workflows.

---

## 🛠️ Prerequisites

*   **Node.js** 20 or higher.
*   **Residential Proxy** (Mandatory for Cloud/VPS deployments). Free Datacenter proxies usually do not work.

---

## ⚙️ Environment Variables (.env)

Create a `.env` file in the root directory or configure it in your deployment dashboard:

```ini
# Server Port
SERVER_PORT=3000

# Security Key (You define it, min 10 chars recommended)
X_API_KEY=your_super_secret_key_for_n8n

# Proxy URL (With authentication)
# Format: http://username:password@host:port
PROXY_URL=http://user123:pass123@br.residential.proxy.com:10000
```

---

## 📦 Installation & Local Development

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run in development mode:**
    ```bash
    npm run dev
    ```

3.  **Build for production:**
    ```bash
    npm run build
    npm start
    ```

---

## 🔌 API Endpoints

### Get Transcript

Returns the full text transcript of a specific video.

**Request:**
`GET /transcript/:videoId`

**Required Headers:**
| Key | Value |
| --- | --- |
| `x-api-key` | Value defined in `.env` |

**Example (cURL):**
```bash
curl -X GET "http://localhost:3000/transcript/8VCBvortiZc" \
     -H "x-api-key: your_super_secret_key_for_n8n"
```

**Success Response (200 OK):**
```json
{
  "videoId": "8VCBvortiZc",
  "transcript": "Full text of the video caption concatenated here...",
  "meta": {
    "processedAt": "2025-12-24T20:00:00.000Z"
  }
}
```

**Common Errors:**
*   `400 Bad Request`: Invalid Video ID format.
*   `401 Unauthorized`: Invalid or missing API Key.
*   `404 Not Found`: Video does not exist, is private, or has no captions.
*   `429 Too Many Requests`: API Rate limit exceeded or YouTube temporary block (Captcha).
*   `502 Bad Gateway`: Upstream Proxy connection error.

---

## 🐳 Deployment on Coolify

This project includes an optimized `Dockerfile`.

1.  Create a new Service in Coolify (Source Code / GitHub).
2.  Set the **Build Pack** to Dockerfile.
3.  In **Environment Variables**, add `X_API_KEY`, `PROXY_URL`, and `SERVER_PORT`.
4.  Expose port `3000`.
5.  Deploy.

**Note on Proxies:** If you are hosting on Hetzner, AWS, DigitalOcean, etc., setting the `PROXY_URL` variable is **mandatory**. YouTube blocks IPs from these networks almost instantly.

---

## 🔗 Integration with n8n

Use the **HTTP Request** node to consume this service.

*   **Method:** `GET`
*   **URL:** `https://your-coolify-service.com/transcript/{{ $json.videoId }}`
*   **Authentication:** `Generic Credential Type` -> `Header Auth`
*   **Header Name:** `x-api-key`
*   **Header Value:** `(Your key configured in .env)`
