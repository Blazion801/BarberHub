-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 19, 2026 at 05:57 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `barberhub_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `barbers`
--

CREATE TABLE `barbers` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `specialty` varchar(255) NOT NULL,
  `experience_years` int(11) DEFAULT 0,
  `price` decimal(10,2) DEFAULT 0.00,
  `overall_rating` decimal(3,1) DEFAULT 5.0,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `photo_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `barbers`
--

INSERT INTO `barbers` (`id`, `full_name`, `specialty`, `experience_years`, `price`, `overall_rating`, `status`, `photo_url`, `created_at`) VALUES
(1, 'kelvin', 'cukur cepmek', 50, 200000.00, 5.0, 'Active', 'http://localhost:5000/uploads/1779203273186-images1.jfif', '2026-05-19 15:07:53');

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `time_slot_id` int(11) NOT NULL,
  `status` enum('Upcoming','Completed','Cancelled','No-Show','Pending') DEFAULT 'Upcoming',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `customer_id`, `time_slot_id`, `status`, `created_at`) VALUES
(1, 1, 1, 'Completed', '2026-05-19 15:08:25'),
(2, 1, 6, 'Cancelled', '2026-05-19 15:09:53'),
(3, 1, 11, 'No-Show', '2026-05-19 15:09:59');

-- --------------------------------------------------------

--
-- Table structure for table `time_slots`
--

CREATE TABLE `time_slots` (
  `id` int(11) NOT NULL,
  `barber_id` int(11) NOT NULL,
  `slot_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('Available','Booked') DEFAULT 'Available'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `time_slots`
--

INSERT INTO `time_slots` (`id`, `barber_id`, `slot_date`, `start_time`, `end_time`, `status`) VALUES
(1, 1, '2026-05-19', '09:00:00', '10:00:00', 'Booked'),
(2, 1, '2026-05-19', '10:00:00', '11:00:00', 'Available'),
(3, 1, '2026-05-19', '11:00:00', '12:00:00', 'Available'),
(4, 1, '2026-05-19', '12:00:00', '13:00:00', 'Available'),
(5, 1, '2026-05-19', '13:00:00', '14:00:00', 'Available'),
(6, 1, '2026-05-19', '14:00:00', '15:00:00', 'Available'),
(7, 1, '2026-05-19', '15:00:00', '16:00:00', 'Available'),
(8, 1, '2026-05-19', '16:00:00', '17:00:00', 'Available'),
(9, 1, '2026-05-19', '17:00:00', '18:00:00', 'Available'),
(10, 1, '2026-05-19', '18:00:00', '19:00:00', 'Available'),
(11, 1, '2026-05-19', '19:00:00', '20:00:00', 'Booked'),
(12, 1, '2026-05-20', '09:00:00', '10:00:00', 'Available'),
(13, 1, '2026-05-20', '10:00:00', '11:00:00', 'Available'),
(14, 1, '2026-05-20', '11:00:00', '12:00:00', 'Available'),
(15, 1, '2026-05-20', '12:00:00', '13:00:00', 'Available'),
(16, 1, '2026-05-20', '13:00:00', '14:00:00', 'Available'),
(17, 1, '2026-05-20', '14:00:00', '15:00:00', 'Available'),
(18, 1, '2026-05-20', '15:00:00', '16:00:00', 'Available'),
(19, 1, '2026-05-20', '16:00:00', '17:00:00', 'Available'),
(20, 1, '2026-05-20', '17:00:00', '18:00:00', 'Available'),
(21, 1, '2026-05-20', '18:00:00', '19:00:00', 'Available'),
(22, 1, '2026-05-20', '19:00:00', '20:00:00', 'Available');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `whatsapp` varchar(20) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('Customer','Admin') DEFAULT 'Customer',
  `life_count` int(11) DEFAULT 3,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `whatsapp`, `email`, `password_hash`, `role`, `life_count`, `created_at`) VALUES
(1, 'test1', '082233334444', 'test1@gmail.com', '$2b$10$0lNZQox5aYabZ1obPJ0yO.VuUC7RuS/j6x7edW2vp0Yo34MRtHmH2', 'Customer', 1, '2026-05-19 15:06:19'),
(2, 'admin', '082299994444', 'admin@barberhub.com', '$2b$10$eUO3YHPIwle5DRgk7BiVOuaGSjptKgwHFXAV4bSuUXS5pDXBM9GG2', 'Admin', 3, '2026-05-19 15:06:46');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `barbers`
--
ALTER TABLE `barbers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `time_slot_id` (`time_slot_id`);

--
-- Indexes for table `time_slots`
--
ALTER TABLE `time_slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `barber_id` (`barber_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `barbers`
--
ALTER TABLE `barbers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `time_slots`
--
ALTER TABLE `time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `time_slots`
--
ALTER TABLE `time_slots`
  ADD CONSTRAINT `time_slots_ibfk_1` FOREIGN KEY (`barber_id`) REFERENCES `barbers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
