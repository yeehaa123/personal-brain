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
ALTER TABLE `notes` ADD `embedding` text;