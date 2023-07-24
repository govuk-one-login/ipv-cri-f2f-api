FROM ubuntu:latest

RUN apt update -y && apt upgrade -y
RUN apt install -y curl unzip

RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt install -y nodejs

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
RUN unzip awscliv2.zip
RUN ./aws/install

COPY . /
WORKDIR /
RUN chmod +x run-tests.sh

RUN cd /src && npm ci

ENTRYPOINT ["/run-tests.sh"]
