CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`prompt` text NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`error` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`session_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`credits` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`owner` text PRIMARY KEY NOT NULL,
	`credits` integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worlds` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`draft` text NOT NULL,
	`published` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`published_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `worlds_owner_unique` ON `worlds` (`owner`);