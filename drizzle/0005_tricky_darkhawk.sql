CREATE TABLE `taskTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`listType` enum('must_do','could_do') NOT NULL DEFAULT 'must_do',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templateSubtasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `templateSubtasks_id` PRIMARY KEY(`id`)
);
