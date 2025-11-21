CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(128),
	"type" varchar(20) NOT NULL,
	"min_threshold" real,
	"max_threshold" real,
	"start_time" varchar(5),
	"end_time" varchar(5),
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"days_of_week" integer[],
	"emails" text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_device_idx" ON "alerts" USING btree ("device_id");