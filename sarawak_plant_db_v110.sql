-- SARAWAK PLANT DATABASE

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


-- Create database
DROP DATABASE IF EXISTS `plant_db`;
DROP DATABASE IF EXISTS `sarawak_plant_db`;
CREATE DATABASE `sarawak_plant_db`;
USE `sarawak_plant_db`;

-- 1. Roles Table 
CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Species Table 
CREATE TABLE `species` (
  `species_id` int(11) NOT NULL AUTO_INCREMENT,
  `scientific_name` varchar(255) DEFAULT NULL,
  `common_name` varchar(255) DEFAULT NULL,
  `is_endangered` tinyint(1) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Users Table 
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_id` int(11) DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1, 
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- 4. Sensor_Devices Table 
CREATE TABLE `sensor_devices` (
  `device_id` int(11) NOT NULL AUTO_INCREMENT,
  `device_name` varchar(100) DEFAULT NULL,
  `species_id` int(11) DEFAULT NULL,
  `location_latitude` decimal(9,6) DEFAULT NULL,
  `location_longitude` decimal(9,6) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`device_id`),
  KEY `species_id` (`species_id`),
  CONSTRAINT `species_ibfk_1` FOREIGN KEY (`species_id`) REFERENCES `species` (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Sensor_Readings Table 
CREATE TABLE `sensor_readings` (
  `reading_id` int(11) NOT NULL AUTO_INCREMENT,
  `device_id` int(11) DEFAULT NULL,
  `temperature` decimal(4,2) DEFAULT NULL,
  `humidity` float DEFAULT NULL,
  `soil_moisture` float DEFAULT NULL,
  `motion_detected` tinyint(1) DEFAULT NULL,
  `alert_generated` tinyint(1) DEFAULT 0,
  `reading_timestamp` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`reading_id`),
  KEY `device_id` (`device_id`),
  CONSTRAINT `sensor_readings_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `sensor_devices` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Plant_Observations Table 
CREATE TABLE `plant_observations` (
  `observation_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `species_id` int(11) DEFAULT NULL,
  `photo_url` varchar(500) NOT NULL,
  `location_latitude` decimal(12,8) NOT NULL,
  `location_longitude` decimal(12,8) NOT NULL,
  `location_name` varchar(255) DEFAULT NULL,
  `location_enc` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_masked` TINYINT(1) NOT NULL DEFAULT 0,
  `source` enum('camera','library') DEFAULT NULL,
  `status` enum('pending','verified','rejected') DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`observation_id`),
  KEY `user_id` (`user_id`),
  KEY `species_id` (`species_id`),
  CONSTRAINT `plant_observations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `plant_observations_ibfk_2` FOREIGN KEY (`species_id`) REFERENCES `species` (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 7. AI_Results Table 
CREATE TABLE `ai_results` (
  `ai_result_id` int(11) NOT NULL AUTO_INCREMENT,
  `observation_id` int(11) DEFAULT NULL,
  `species_id` int(11) DEFAULT NULL,
  `confidence_score` decimal(5,4) DEFAULT NULL,
  `rank` tinyint(4) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`ai_result_id`),
  KEY `observation_id` (`observation_id`),
  KEY `species_id` (`species_id`),
  CONSTRAINT `ai_results_ibfk_1` FOREIGN KEY (`observation_id`) REFERENCES `plant_observations` (`observation_id`),
  CONSTRAINT `ai_results_ibfk_2` FOREIGN KEY (`species_id`) REFERENCES `species` (`species_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 8. Alerts Table 
CREATE TABLE `alerts` (
  `alert_id` int(11) NOT NULL AUTO_INCREMENT,
  `device_id` int(11) DEFAULT NULL,
  `reading_id` int(11) DEFAULT NULL,
  `alert_type` enum('motion','environment') NOT NULL,
  `alert_message` text NOT NULL,
  `is_resolved` tinyint(1) DEFAULT 0,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`alert_id`),
  KEY `device_id` (`device_id`),
  KEY `reading_id` (`reading_id`),
  CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `sensor_devices` (`device_id`),
  CONSTRAINT `alerts_ibfk_2` FOREIGN KEY (`reading_id`) REFERENCES `sensor_readings` (`reading_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 9. MFA Table
CREATE TABLE mfa_challenges (
  `challenge_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `attempts` INT DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `verified` TINYINT(1) DEFAULT 0,

  PRIMARY KEY (challenge_id),

  KEY user_id (user_id),

  CONSTRAINT fk_mfa_user FOREIGN KEY (user_id)
      REFERENCES users(user_id)
      ON DELETE CASCADE
);

-- ==================== SAMPLE DATA ====================

-- 1. Insert Roles 
INSERT INTO `roles` (`role_name`, `description`) VALUES 
('admin', 'System administrator'),
('researcher', 'Plant researcher'),
('public', 'General user');

-- 2. Insert Users 
INSERT INTO `users` (`role_id`, `username`, `email`, `phone`, `password_hash`, `avatar_url` ) VALUES
(1, 'Clements', 'clementlaik2003@gmail.com', '0112233445', 'test1234', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSLpupyeOe_APhBJ1ydHfgqXO6ATCtwPDEOO9bzKoQd__wlSMBgc5gH-o-H3Iv4EXXhWs9jcpKMNs9WpG5tE2Ded0a8Q4v4G4nb10-JoWOP&s=10'),
(3, 'JiaXin', 'jiaxinteo953@gmail.com', '0123885678', 'user123', NULL),
(1, 'Adil Rumy', 'ahu.rumy@gmail.com', '0118765432', 'password', NULL),
(2, 'Adil Rumy5', 'nizmo801@gmail.com', '0128664433', 'password2', NULL),
(3, 'Adil Rumy05', 'adilrumy@outlook.com', '0118664433', 'password3', NULL),
(1, 'Phillip', 'phillipchristopher2005@gmail.com', '01114202068', 'password4', NULL);

INSERT INTO species (species_id, scientific_name, common_name, is_endangered, description, image_url) VALUES
    (1, 'acacia_auriculiformis', 'Earleaf Acacia', 0, 
     'Fast-growing evergreen tree with distinctive "ear-shaped" pods. Widely planted for erosion control and as ornamental tree in tropical regions',
     'https://c8.alamy.com/comp/W3HFK8/close-up-of-acacia-auriculiformis-flowers-blooming-in-morning-sunlight-golden-wattle-plant-W3HFK8.jpg'),

    (2, 'acacia_mangium', 'Brown Salwood', 0,
     'Fast-growing, medium-to-large tropical tree, brown salwood is highly valued for its durable timber, pulp production, and ability to rehabilitate degraded lands due to its nitrogen-fixing properties',
     'https://editedimages.s3-accelerate.amazonaws.com/acacia-mangium-leaf-and-flower_37039703642_o.jpg'),

    (3, 'alocasia_longiloba', 'Tiger Taro', 1,
     'Large tropical plant known for its striking, arrow-shaped leaves, which feature dark green blades, contrasting pale veins, and a deep purple underside',
     'https://www.picturethisai.com/wiki-image/1080/349675776027066368.jpeg'),

    (4, 'alocasia_macrorrhizos', 'Giant Taro', 1,
     'Large evergreen perennial herb that can grow up to 4 meters tall with large, upright, arrowhead-shape leaves and long petioles, native to rainforest',
     'https://www.gardenia.net/wp-content/uploads/2023/04/shutterstock_1121306816Optimized-Optimized-711x533.webp'),

    (5, 'casuarina_equisetifolia', 'Coastal She-oak', 1,
     'Fast-growing evergreen tree with fine, drooping branchlets which look like needles, commonly planted in coastal areas for windbreaks and erosion control',
     'https://inaturalist-open-data.s3.amazonaws.com/photos/16450498/large.jpeg'),

    (6, 'cerbera_manghas', 'Sea Mango', 0,
     'A highly poisonous evergreen coastal tree characterized by glossy leaves, fragrant white flowers, and distinctive, buoyant red fruits that facilitate its water dispersal across tropical coastlines',
     'https://s3-us-west-2.amazonaws.com/ntbgmeettheplants/images/600h/2585.jpg'),

    (7, 'crotalaria_pallida', 'Smooth Rattlepod', 0,
     'Herbaceous plant with yellow flowers and inflated seed pods that rattle when dry. Often used as green manure in agriculture.',
     'https://upload.wikimedia.org/wikipedia/commons/f/fb/Crotalaria_pallida_var._pallida_08.JPG'),

    (8, 'morinda_citrifolia', 'Noni', 0,
     'Tropical evergreen tree known for its yellow-white fruit, traditionally used in herbal medicine',
     'https://www.jircas.go.jp/sites/default/files/thaivege/074A_4.jpg'),

    (9, 'neolamarckia_cadamba', 'Burflower-tree', 0,
     'A fast-growing tropical tree known for its fragrant, spherical flower clusters and uses in timber and traditional medicine',
     'https://assets-news.housing.com/news/wp-content/uploads/2022/10/02001326/neolamarckia-cadamba-feature-compressed.jpg'),

    (10, 'oldenlandia_corymbosa', 'Flat-Top Mille Graines', 0,
     'Small annual herb with white flowers, used in traditional medicine for fever and liver disorders in various Asian cultures.',
     'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Oldenlandia_corymbosa%2C_diamond_flower.jpg/250px-Oldenlandia_corymbosa%2C_diamond_flower.jpg'),

    (11, 'peperomia_pellucida', 'Shiny Bush', 0,
     'Small herbaceous plant with translucent leaves and succulent stems. Used in traditional medicine for arthritis and as a vegetable in salads',
     'https://images.squarespace-cdn.com/content/v1/5324bf63e4b05fc1fc6ea99d/1597327030470-4ZG8T85XID0ZALUUY850/peperomia-pellucida.jpg'),

    (12, 'phyllanthus_amarus', 'Stonebreaker', 0,
     'Small medicinal herb traditionally used for kidney stones and liver disorders. It is identified by seeds hanging beneath the leaves',
     'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSscwsfyojVOSbFHHFbkWIVsu6CXaz1YvvEog&s');

-- 4. Insert Sensor_Devices 
INSERT INTO `sensor_devices` (`device_name`, `species_id`, `location_latitude`, `location_longitude`, `is_active`) VALUES 
('Test Sensor Device 1', 1, 1.55330000, 110.35920000, 1),   -- Kuching
('Test Sensor Device 2', 1, 4.39960000, 113.99160000, 1),   -- Miri
('Test Sensor Device 3', 2, 2.28790000, 111.83030000, 1),   -- Sibu
('Test Sensor Device 4', 3, 3.16670000, 113.03330000, 1);   -- Bintulu

-- 5. Insert Sensor Readings
SET @demo_now = '2025-11-17 10:25:00'; -- Time set as this

INSERT INTO `sensor_readings` 
(`device_id`, `temperature`, `humidity`, `soil_moisture`, `motion_detected`, `alert_generated`, `reading_timestamp`)
VALUES
(1, 28.97, 65.2, 30.6, 1, 1, '2025-11-17 10:45:00'),
(2, 31.90, 63.7, 45.8, 0, 0, '2025-11-17 10:45:00'),
(3, 24.67, 69.2, 36.4, 0, 0, '2025-11-17 10:45:00'),
(4, 35.14, 57.8, 15.3, 0, 1, '2025-11-17 10:45:00'),
-- Analytics Data
-- Reading 1 (50 mins ago)
(1, 29.5, 64.0, 32.0, 0, 0, DATE_SUB(@demo_now, INTERVAL 50 MINUTE)),
-- Reading 2 (40 mins ago) - Soil dip
(1, 29.2, 64.5, 28.0, 0, 1, DATE_SUB(@demo_now, INTERVAL 40 MINUTE)),
-- Reading 3 (30 mins ago) - Motion detected
(1, 29.0, 65.0, 31.0, 1, 1, DATE_SUB(@demo_now, INTERVAL 30 MINUTE)),
-- Reading 4 (20 mins ago)
(1, 28.8, 65.5, 31.5, 0, 0, DATE_SUB(@demo_now, INTERVAL 20 MINUTE)),
-- Reading 5 (10 mins ago) - Temp spike
(1, 30.1, 63.0, 30.0, 0, 1, DATE_SUB(@demo_now, INTERVAL 10 MINUTE)),


-- =============================================
-- 2. DATA FOR "24 HOUR" VIEW (5 rows)
-- Spread out over the last 24 hours
-- =============================================
-- Reading 1 (22 hours ago)
(1, 26.5, 72.0, 45.0, 0, 0, DATE_SUB(@demo_now, INTERVAL 22 HOUR)),
-- Reading 2 (18 hours ago) - Night dip
(1, 24.2, 75.0, 48.0, 0, 1, DATE_SUB(@demo_now, INTERVAL 18 HOUR)),
-- Reading 3 (12 hours ago) - Motion
(1, 25.0, 74.0, 46.5, 1, 1, DATE_SUB(@demo_now, INTERVAL 12 HOUR)),
-- Reading 4 (8 hours ago)
(1, 27.8, 68.0, 40.0, 0, 0, DATE_SUB(@demo_now, INTERVAL 8 HOUR)),
-- Reading 5 (4 hours ago) - Soil low
(1, 28.5, 66.0, 35.0, 0, 1, DATE_SUB(@demo_now, INTERVAL 4 HOUR)),


-- =============================================
-- 3. DATA FOR "7 DAY" VIEW (5 rows)
-- Spread out over the last 7 days
-- =============================================
-- Reading 1 (6 days ago)
(1, 27.1, 70.0, 50.0, 0, 0, DATE_SUB(@demo_now, INTERVAL 6 DAY)),
-- Reading 2 (5 days ago) - Temp spike
(1, 32.0, 60.0, 45.0, 0, 1, DATE_SUB(@demo_now, INTERVAL 5 DAY)),
-- Reading 3 (4 days ago) - Motion
(1, 28.5, 68.0, 42.0, 1, 1, DATE_SUB(@demo_now, INTERVAL 4 DAY)),
-- Reading 4 (3 days ago)
(1, 27.9, 71.0, 48.0, 0, 0, DATE_SUB(@demo_now, INTERVAL 3 DAY)),
-- Reading 5 (1 day ago) - Soil very low
(1, 28.2, 69.0, 25.0, 0, 1, DATE_SUB(@demo_now, INTERVAL 1 DAY));

-- 6. Insert Alert Table
INSERT INTO `alerts` 
(`device_id`, `reading_id`, `alert_type`, `alert_message`, `is_resolved`, `resolved_at`, `created_at`)
VALUES
('1' , 1, 'motion', 'Possible intrusion detected.', 0, NULL, '2025-11-17 10:15:00'),
('4' , 4, 'environment', 'Soil moisture is low', 0, NULL, '2025-11-17 10:15:00'),
('4' , 4, 'environment', 'Temperature is high', 0, NULL, '2025-11-17 10:15:00');
-- ('3' , 3, 'motion', 'Habitat disturbance detected', 0, NULL, '2025-11-07 08:21:00');

COMMIT;




