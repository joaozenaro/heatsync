CREATE TABLE "devices" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" uuid,
	"group_id" varchar(128)
);
--> statement-breakpoint
CREATE TABLE "temperature_aggregates" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"granularity" varchar(8) NOT NULL,
	"median_c" real NOT NULL,
	"device_id" varchar(128)
);
--> statement-breakpoint
CREATE TABLE "temperature_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"temperature_c" real NOT NULL,
	"device_id" varchar(128)
);
--> statement-breakpoint
CREATE INDEX "devices_owner_idx" ON "devices" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "devices_group_idx" ON "devices" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "temperature_aggregates_bucket_idx" ON "temperature_aggregates" USING btree ("granularity","bucket_start");--> statement-breakpoint
CREATE INDEX "temperature_readings_taken_at_idx" ON "temperature_readings" USING btree ("taken_at");