# TKA Modul 1

Question Source: [TKA Modul 2](https://docs.google.com/document/d/14TOStsEohCz2ONkC2XPJNCVz7YZlFqmZ4nXjF-IqtmU/edit?tab=t.0)

Kelompok 08:

1. Prabaswara @zostradamus
2. Zelig @zelebwr
3. Adiwidya @Riverzn

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