FROM node:18

# Create app directory
WORKDIR /usr/src/order/app

# Install app dependencies
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 8085
CMD [ "node", "server.js" ]

#docker build -t api-order . 
#docker run --name api-order -p 8085:8085 -d api-order