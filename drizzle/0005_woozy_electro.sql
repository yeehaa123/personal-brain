ALTER TABLE `notes` ADD `source` text DEFAULT 'import';--> statement-breakpoint
ALTER TABLE `notes` ADD `conversation_metadata` text;--> statement-breakpoint
ALTER TABLE `notes` ADD `confidence` integer;--> statement-breakpoint
ALTER TABLE `notes` ADD `verified` integer DEFAULT false;