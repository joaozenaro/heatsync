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
CREATE INDEX "temperature_aggregates_bucket_idx" ON "temperature_aggregates" USING btree ("granularity","bucket_start");--> statement-breakpoint
CREATE INDEX "temperature_readings_taken_at_idx" ON "temperature_readings" USING btree ("taken_at");