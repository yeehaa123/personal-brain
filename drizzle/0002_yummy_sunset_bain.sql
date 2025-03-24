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
