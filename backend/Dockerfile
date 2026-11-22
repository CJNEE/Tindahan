FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
WORKDIR /code
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt
COPY . /code/
RUN mkdir -p /vol/media
ENV MEDIA_ROOT=/vol/media
EXPOSE 8000
CMD ["gunicorn","store_project.wsgi:application","--bind","0.0.0.0:8000"]
