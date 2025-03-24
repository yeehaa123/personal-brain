CREATE TABLE `note_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`content` text NOT NULL,
	`embedding` text,
	`chunk_index` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`tags` text,
	`embedding` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`public_identifier` text,
	`profile_pic_url` text,
	`background_cover_image_url` text,
	`first_name` text,
	`last_name` text,
	`full_name` text NOT NULL,
	`follower_count` integer,
	`occupation` text,
	`headline` text,
	`summary` text,
	`country` text,
	`country_full_name` text,
	`city` text,
	`state` text,
	`experiences` text,
	`education` text,
	`languages` text,
	`languages_and_proficiencies` text,
	`accomplishment_publications` text,
	`accomplishment_honors_awards` text,
	`accomplishment_projects` text,
	`volunteer_work` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
