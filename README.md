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

Important:
The backend will not function correctly without this database.
Make sure the SQL has been imported and the sarawak_plant_db database exists before running npm run start.

---

## 4. Running the Backend
npm run start

