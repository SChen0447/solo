#!/bin/bash

echo "正在安装根目录依赖..."
npm install

echo "正在安装前端依赖..."
cd client
npm install
cd ..

echo "正在安装后端依赖..."
cd server
npm install
cd ..

echo "启动前后端开发服务器..."
npm run dev
