# SmartPlant Sarawak – Backend API

This repository contains the backend API for the SmartPlant Sarawak project.  
It provides:

- REST endpoints for plant identification, observations and heatmaps  
- Integration with a Python AI worker for plant species classification  
- IoT sensor ingestion via MQTT and alert generation  
- Authentication with role based access control and MFA  
- A MySQL database schema for users, species, observations, AI results and IoT data  

The backend is implemented in Node.js with Express and connects to a MySQL database called `sarawak_plant_db`.

---

## 1. Prerequisites

Before running the backend, make sure you have:

- **Node.js** and **npm** installed  
- **MySQL** server running locally or accessible via network  
- **Python 3** (for the AI worker process)  
- Optional, an MQTT broker (for live IoT sensor ingestion), e.g. HiveMQ public broker

---

## 2. Getting Started

### 2.1 Clone the repository
git clone https://github.com/adilrumy05/SmartPlant_Backend.git

cd SmartPlant_Backend

### 2.2 Install dependencies
npm install

---

## 3. Database Setup

### 3.1 Import the SQL file
1. Start your MySQL server.
2. Import the SQL file using your preferred method, for example:
mysql -u <username> -p < sarawak_plant_db_v110.sql
3. To run the backend and databse you should be on port 3307

### 3.2 Edit the files
1. in .env change DB_USER and DB_PASS to your mysql username and password
2. in /config/db.js in the pool constant, change your DB_USER and DB_PASS to your mysql username and password

Important:
The backend will not function correctly without this database.
Make sure the SQL has been imported and the sarawak_plant_db database exists before running npm run start.

---

## 4. Running agentic service (do it once)
1. Sign up for free ngrok account
2. copy ngrok authtoken and paste into google colab file
3. Run agentic ai file in google colab
4. copy output link and paste into aicontroller.js

---

## 5. Running the Backend
npm run start

