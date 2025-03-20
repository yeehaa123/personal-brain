CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`tags` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
