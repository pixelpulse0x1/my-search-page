FROM python:3.12-alpine

WORKDIR /app

RUN apk add --no-cache tzdata
ENV TZ=Asia/Shanghai

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

RUN mkdir -p /data/database /data/backgrounds /data/wallpapers /data/icons /data/json /data/log /data/exports

EXPOSE 3150

CMD ["python", "-c", "from app import create_app; from app.modules.database import init_db; init_db(); app = create_app(); app.run(host='0.0.0.0', port=3150, debug=False)"]
