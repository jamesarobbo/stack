CREATE TABLE `day_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_samples` (
	`id` text PRIMARY KEY NOT NULL,
	`metric` text NOT NULL,
	`date` text NOT NULL,
	`value` real NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`cost_weight` real NOT NULL,
	`summary` text,
	`family` text,
	`family_label` text
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`catalogue_id` text,
	`name` text NOT NULL,
	`brand` text,
	`note` text,
	`price_cents` integer NOT NULL,
	`servings_per_container` integer NOT NULL,
	`servings_per_day` real NOT NULL,
	`start_date` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
