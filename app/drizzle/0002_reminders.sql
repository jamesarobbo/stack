CREATE TABLE `reminders` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `time` text NOT NULL,
  `days` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reminders_product` ON `reminders` (`product_id`);
--> statement-breakpoint
CREATE TABLE `intake_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `day` text NOT NULL,
  `taken_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intake_product_day` ON `intake_logs` (`product_id`, `day`);
