# TKA Modul 2

Question Source: [TKA Modul 2](https://docs.google.com/document/d/14TOStsEohCz2ONkC2XPJNCVz7YZlFqmZ4nXjF-IqtmU/edit?tab=t.0)

Kelompok 08:

1. Prabaswara @zostradamus
2. Zelig @zelebwr
3. Adiwidya @Riverzn

---

# Soal 2

In the second number here we are needed to build a Docker Compose in these conditions:

```md
a. Terdapat 3 service: backend, object-storage, nginx - backend (Express.js) - object-storae (MinIO) - nginx (reverse proxy)
b. Semua service berada pada network yang sama
c. Backend - Terhubung ke object storage menggunakan environment variables menggunakan file .env terpisah - Hanya berjalan ketika object storage sudah siap menerima koneksi (gunakan depends_on dan health check) - Dilarang mengekspos port ke host, semua akses ke backend harus melalui Nginx reverse proxy
d. Object Storage - Menggunakan image: minio/minio - Menggunakan volume minio_data untuk persistensi data - Expose port 9000 untuk API dan port 9001 untuk GUI - Gunakan health check untuk memastikan object storage siap digunakan oleh backend
e. Nginx - Menggunakan image nginx versi terbaru - Nginx akan mengexpose backend ke host sehingga dapat diakse dari luar container
```

## Step 1: Directory Setup

```bash
$ wget --no-check-certificate 'https://drive.google.com/uc?export=download&id=1GcsOpS8X7KQFBZnlwxQkN4KooQiMR4
St' -O ./source/soal-2.zip
$ unzip source/soal-2.zip -d source
$ rm -rf source/soal-2.zip
$ touch source/soal-2/.env source/soal-2/docker-compose.yml
```

## Step 2: Make the `docker-compose.yml`

Healthcheck Docker Compose Reference: [Docker Compose Health Checks](https://last9.io/blog/docker-compose-health-checks/)

```yaml
services:
  object-storage:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    networks:
      - hollow_net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    env_file: .env
    networks:
      - hollow_net
    depends_on:
      object-storage:
        condition: service_healthy

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - hollow_net
    depends_on:
      - backend

volumes:
  minio_data:

networks:
  hollow_net:
    driver: bridge
```

## Step 3: Make the Backend Work

To make the backend work, we need to create the `.env` file.

```env
MINIO_ENDPOINT=object-storage
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=hollow-missions
```

## Step 4: Fixing the File Upload Size Limit

To increase the file upload size limit, it's easily increased by adding this line into `default.conf`:

```conf
server {
    listen 80;

    client_max_body_size 10M;

    location / {
        proxy_pass http://backend:3000;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
};
```

## Step 5: Testing

### 1. Starting the Docker Compose

```docker
docker compose up -d
```

### 2. Verify the MinIO GUI and Bucket

- Open [localhost](http://localhost:9001)
- Credentials: { Username: `minioadmin`, Password: `minioadmin`}
- There should be a bucket list (`hollow-missions`)

### 3. Test the File Upload

- Using Postman will make everything much easier
- Create a `POST` request to `http://localhost/upload`
- Upload a file larger than 2MB
- Upload a file as large as 10MB
- Upload a file larger than 10MB

> [!NOTE]
> Creating the files can use this command:
>
> ```bash
> dd if=/dev/urandom of=random.bin bs=1024 count=10000
> ```

### 4. Check the file System

- Go to [localhost/files](http://localhost/files)
- Check the if the files are listed there

### 5. Check Data Persistence

- Shut down Docker Compose: `docker compose down`
- Bring it back online: `docker compose up -d`
- Check if the files are still [there](http://localhost/files)

---
# Soal 3 
## 📖 Project Overview
> Aoi, Ran, and Ichigo are working on a group project called the **"Digital Identity System"**. The problem they faced was that the application ran differently on each laptop due to different Python and MySQL versions installed on each machine.
To solve this, the project is containerized using **Docker Compose**, so anyone in the group can run the full application — web server and database — with a single command, regardless of their local environment.
 
---
 
## 📁 Project Structure
 
```
project-A01/
├── web/
│   ├── app.py              # Flask web application
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Container build instructions for web service
├── data/
│   └── setup.sql           # SQL script to initialize the database
└── docker-compose.yml      # Orchestrates all services
```
 
---
 
### Step 1 — Project Folder Structure
 
The first step is setting up the project directory. This structure separates concerns cleanly:
 
| Folder/File | Purpose |
|---|---|
| `web/` | Contains all Flask application files |
| `data/` | Contains the SQL initialization script |
| `docker-compose.yml` | The orchestration file that ties everything together |
 
```bash
# Create the folder structure from terminal
mkdir -p project-A01/web
mkdir -p project-A01/data
touch project-A01/web/app.py
touch project-A01/web/requirements.txt
touch project-A01/web/Dockerfile
touch project-A01/data/setup.sql
touch project-A01/docker-compose.yml
```
 
> Having a clear structure is important so Docker knows where to find files when building and running services.
 
---
 
### Step 2 — SQL Database Setup
 
**📄 File: `data/setup.sql`**
 
This file is automatically executed by MySQL when the container starts for the first time. It creates the database, defines the table schema, and inserts the group members' data.
 
```sql
-- Create the database for this group
CREATE DATABASE IF NOT EXISTS Identitas_A01;
 
-- Switch to the newly created database
USE Identitas_A01;
 
-- Create the Anggota (Member) table
-- NRP is the Primary Key (unique student ID, cannot be duplicated)
-- Nama is the student's name (cannot be empty)
CREATE TABLE IF NOT EXISTS Anggota (
    NRP  VARCHAR(20)  PRIMARY KEY,
    Nama VARCHAR(100) NOT NULL
);
 
-- Insert group member data into the table
INSERT INTO Anggota (NRP, Nama) VALUES
('5027241001', 'Aoi Kiriya'),
('5027241002', 'Ran'),
('5027241003', 'Ichigo');
```
 
| Keyword | Explanation |
|---|---|
| `CREATE DATABASE IF NOT EXISTS` | Only creates the database if it does not already exist — safe to re-run |
| `PRIMARY KEY` | Ensures NRP is unique for every student record |
| `NOT NULL` | The Nama column must always have a value |
| `INSERT INTO` | Populates the table with the actual group members |
 
---
 
### Step 3 — Flask App & Database Connection
 
**📄 File: `web/app.py`** — Import section & `connect_db()` function
 
This is the core of the application. Because the MySQL container may take a few seconds to fully start, the connection function uses a `while True` loop with `try-except` so the web service keeps retrying instead of crashing immediately.
 
```python
from flask import Flask
import mysql.connector
import time
 
app = Flask(__name__)
 
def connect_db():
    while True:             # Keep retrying until connection succeeds
        try:
            conn = mysql.connector.connect(
                host="user_A01",        # Must match the MySQL service name in docker-compose.yml
                user="root",
                password="7KA26A51K",
                database="Identitas_A01"
            )
            print("Database connected!")
            return conn     # Return the connection object on success
        except mysql.connector.Error as e:
            # If MySQL is not ready yet, wait 2 seconds and try again
            print(f"Database not ready: {e}. Retrying in 2s...")
            time.sleep(2)
```
 
| Key Point | Explanation |
|---|---|
| `host="user_A01"` | This must **exactly match** the MySQL service name defined in `docker-compose.yml` — Docker uses service names as internal hostnames |
| `while True` | Keeps the application alive and retrying even if the database isn't ready yet |
| `try-except` | Catches connection errors gracefully without crashing the app |
| `time.sleep(2)` | Waits 2 seconds between retries to avoid spamming the database |
 
> **`pip install mysql-connector-python`** must be run locally if testing outside Docker.
 
---
 
### Step 4 — Route & SQL Query
 
**📄 File: `web/app.py`** — `@app.route('/')` and `app.run()`
 
This defines what happens when a user visits the application in their browser. Each visit triggers a SQL query that picks **one random student** from the database.
 
```python
@app.route('/')
def index():
    conn = connect_db()
    cursor = conn.cursor()
 
    # Pick 1 random student name from the table on every request
    cursor.execute("SELECT Nama, NRP FROM Anggota ORDER BY RAND() LIMIT 1")
    row = cursor.fetchone()   # Fetches exactly 1 row
    cursor.close()
    conn.close()
 
    nama, nrp = row           # Unpack the result into two variables
 
    return f"""
    <html>
    <body>
        <h1>Nama Mahasiswa:</h1>
        <h2>{nama}</h2>
        <p>NRP: {nrp}</p>
    </body>
    </html>
    """
 
# Run Flask on all network interfaces (required for Docker) on port 5000
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```
 
| Key Point | Explanation |
|---|---|
| `ORDER BY RAND()` | Shuffles all rows randomly on every query |
| `LIMIT 1` | Returns only 1 row from the shuffled result |
| `fetchone()` | Retrieves exactly 1 row from the query result |
| `host='0.0.0.0'` | Makes Flask accessible from outside the container (not just localhost inside the container) |
| `port=5000` | Flask listens on port 5000 **inside** the container |
 
---
 
### Step 5 — Dockerfile
 
**📄 File: `web/Dockerfile`**
 
The Dockerfile defines how the web service container is built. It starts from an official Python base image, copies the application code, and installs the required dependencies.
 
```dockerfile
# Use the official lightweight Python 3.11 image as the base
FROM python:3.11-slim
 
# Set the working directory inside the container
WORKDIR /app
 
# Copy all files from ./web into the container's /app directory
COPY . .
 
# Install Python dependencies listed in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
 
# Command to run when the container starts
CMD ["python", "app.py"]
```
 
**📄 File: `web/requirements.txt`**
 
```
flask
mysql-connector-python
```
 
| Instruction | Explanation |
|---|---|
| `FROM python:3.11-slim` | Uses an official, lightweight Python image — ensures the same Python version for everyone |
| `WORKDIR /app` | All subsequent commands run inside `/app` in the container |
| `COPY . .` | Copies `app.py`, `requirements.txt`, and `Dockerfile` into the container |
| `RUN pip install` | Installs Flask and mysql-connector during the image build phase |
| `CMD` | Default command executed when the container starts |
 
---
 
### Step 6 — Docker Compose Configuration
 
**📄 File: `docker-compose.yml`**
 
This is the orchestration file that defines both services (database and web), their configuration, how they communicate, and their dependencies.
 
```yaml
version: '3.8'
 
services:
 
  # ── DATABASE SERVICE ─────────────────────────────────────
  user_A01:                              # Service name = host name used in app.py
    image: mysql:8.0                     # Use official MySQL 8.0 image
    environment:
      MYSQL_ROOT_PASSWORD: 7KA26A51K    # Root password (must match app.py)
      MYSQL_DATABASE: Identitas_A01     # Database auto-created on first start
    volumes:
      - db_data:/var/lib/mysql          # Persist DB data even if container is restarted
      - ./data/setup.sql:/docker-entrypoint-initdb.d/setup.sql
      # ↑ MySQL auto-runs any .sql file placed in this special directory
    networks:
      - app_network
 
  # ── WEB SERVICE ──────────────────────────────────────────
  web:
    build: ./web                         # Build image using ./web/Dockerfile
    ports:
      - "8080:5000"                      # Map host port 8080 → container port 5000
    depends_on:
      - user_A01                         # Web service starts AFTER database service
    networks:
      - app_network                      # Same network as DB so they can communicate
 
# ── VOLUMES & NETWORKS ───────────────────────────────────
volumes:
  db_data:                               # Named volume for MySQL data persistence
 
networks:
  app_network:                           # Shared network between web and database
```
 
| Key Point | Explanation |
|---|---|
| `user_A01` (service name) | Docker uses this as the internal hostname — **must match** `host=` in `app.py` |
| `MYSQL_ROOT_PASSWORD` | Must be the same password used in `connect_db()` |
| `volumes: db_data` | Data is saved to a Docker-managed volume and survives container restarts |
| `docker-entrypoint-initdb.d` | Special MySQL directory — any `.sql` file here is auto-executed on first start |
| `ports: "8080:5000"` | Users access via port `8080` on their machine; Docker forwards it to Flask's port `5000` |
| `depends_on` | Ensures the MySQL container starts before the Flask container |
| `networks: app_network` | Both services share the same internal network so they can reach each other by service name |
 
---
 
### Step 7 — Running the Application
 
With all files in place, the entire system can be launched with **one command**:
 
```bash
# Navigate into the project folder
cd project-A01
 
# Build images and start all services
docker-compose up --build
```
 
Then open your browser and go to:
 
```
http://localhost:8080
```
 
Every time you **refresh** the page, `ORDER BY RAND()` runs a new random pick, so the name displayed will rotate among Aoi, Ran, and Ichigo.
 
To stop all services:
```bash
docker-compose down
```
