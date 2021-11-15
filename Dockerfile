FROM ubuntu:18.04 AS liteclient

RUN apt-get update && \
	apt-get install -y build-essential git make cmake clang libgflags-dev zlib1g-dev libssl-dev libreadline-dev libmicrohttpd-dev pkg-config libgsl-dev python3 python3-dev python3-pip

ENV CC clang
ENV CXX clang++
ENV CCACHE_DISABLE=1

RUN git clone --recursive https://github.com/newton-blockchain/ton.git

RUN apt-get install -y wget
RUN wget https://newton-blockchain.github.io/global.config.json -O config.json

RUN mkdir ton/build && cd ton/build && cmake -DCMAKE_BUILD_TYPE=Release ..

RUN cd ton/build && make lite-client

RUN wget https://deb.nodesource.com/setup_14.x -O nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs

WORKDIR /app
#COPY /ton/build/* ../
COPY package*.json ./
RUN set NODE_OPTIONS=--max-old-space-size=30720
RUN npm install
COPY . .
EXPOSE 8080
