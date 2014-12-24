-- MySQL dump 10.13  Distrib 5.6.19, for osx10.9 (x86_64)
--
-- Host: localhost    Database: aws_deploy
-- ------------------------------------------------------
-- Server version	5.6.19

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `awd_applications`
--

DROP TABLE IF EXISTS `awd_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `awd_applications` (
  `deployment_id` varchar(45) NOT NULL,
  `application_name` varchar(100) NOT NULL,
  `application_environment` text NOT NULL,
  `application_bucket` text NOT NULL,
  PRIMARY KEY (`deployment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `awd_applications`
--

LOCK TABLES `awd_applications` WRITE;
/*!40000 ALTER TABLE `awd_applications` DISABLE KEYS */;
/*!40000 ALTER TABLE `awd_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `awd_deployments`
--

DROP TABLE IF EXISTS `awd_deployments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `awd_deployments` (
  `deployment_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `deployment_name` varchar(45) NOT NULL,
  `deployment_created_at` datetime NOT NULL,
  `deployment_created_by` bigint(20) NOT NULL,
  `deployment_updated_at` datetime DEFAULT NULL,
  `deployment_updated_by` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`deployment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `awd_deployments`
--

LOCK TABLES `awd_deployments` WRITE;
/*!40000 ALTER TABLE `awd_deployments` DISABLE KEYS */;
/*!40000 ALTER TABLE `awd_deployments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `awd_products`
--

DROP TABLE IF EXISTS `awd_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `awd_products` (
  `product_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `product_name` varchar(45) NOT NULL,
  `product_created_at` datetime NOT NULL,
  `product_created_by` bigint(20) NOT NULL,
  `product_application` varchar(100) NOT NULL,
  `product_environment` varchar(64) NOT NULL,
  PRIMARY KEY (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `awd_products`
--

LOCK TABLES `awd_products` WRITE;
/*!40000 ALTER TABLE `awd_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `awd_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `awd_repositories`
--

DROP TABLE IF EXISTS `awd_repositories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `awd_repositories` (
  `deployment_id` bigint(20) NOT NULL,
  `repository_type` enum('github') NOT NULL,
  `repository_created_by` bigint(20) NOT NULL,
  `repository_created_at` datetime NOT NULL,
  `repository_state` varchar(64) NOT NULL,
  `repository_url` text,
  `repository_credentials` text,
  PRIMARY KEY (`deployment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `awd_repositories`
--

LOCK TABLES `awd_repositories` WRITE;
/*!40000 ALTER TABLE `awd_repositories` DISABLE KEYS */;
/*!40000 ALTER TABLE `awd_repositories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `awd_users`
--

DROP TABLE IF EXISTS `awd_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `awd_users` (
  `user_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_email` text NOT NULL,
  `user_name` text NOT NULL,
  `user_pass` varchar(64) NOT NULL,
  `user_level` int(11) DEFAULT '0',
  `user_created_at` datetime NOT NULL,
  `user_created_from` varchar(45) NOT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `awd_users`
--

LOCK TABLES `awd_users` WRITE;
/*!40000 ALTER TABLE `awd_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `awd_users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2014-12-24 15:17:27
