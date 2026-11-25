-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "achievements" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "location" VARCHAR(100),
    "member_id" BIGINT NOT NULL,
    "organizer" VARCHAR(100),
    "title" VARCHAR(200) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "url" VARCHAR(500),
    "year_month" VARCHAR(7),

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "admin_id" BIGINT,
    "admin_name" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL,
    "details" TEXT,
    "target_id" BIGINT,
    "target_type" VARCHAR(50),

    CONSTRAINT "admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_member_notes" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" BIGINT,
    "admin_name" VARCHAR(100),
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "admin_member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_privacy_access_logs" (
    "id" BIGSERIAL NOT NULL,
    "accessed_at" TIMESTAMP(6) NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "admin_id" BIGINT,
    "admin_name" VARCHAR(100),
    "detail" VARCHAR(500),
    "hash" VARCHAR(64) NOT NULL,
    "ip_address" VARCHAR(45),
    "prev_hash" VARCHAR(64),
    "reason" VARCHAR(300),
    "subject_count" INTEGER,
    "subject_member_id" BIGINT,

    CONSTRAINT "admin_privacy_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "ends_at" TIMESTAMP(6),
    "image_url" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "link_url" VARCHAR(500),
    "starts_at" TIMESTAMP(6),
    "title" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" BIGSERIAL NOT NULL,
    "count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" BIGSERIAL NOT NULL,
    "budget" VARCHAR(255),
    "client_name" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL,
    "message" TEXT,
    "rejected_reason" TEXT,
    "shoot_date" DATE NOT NULL,
    "shoot_location" VARCHAR(200),
    "shoot_type" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "client_id" BIGINT,
    "photographer_id" BIGINT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_brands" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "logo_url" VARCHAR(500),
    "member_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "client_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" BIGSERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_avatar_url" VARCHAR(500),
    "member_id" BIGINT NOT NULL,
    "member_name" VARCHAR(100) NOT NULL,
    "parent_id" BIGINT,
    "photo_id" BIGINT NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" BIGSERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "likes" INTEGER NOT NULL,
    "subtitle" VARCHAR(255),
    "title" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_sets" (
    "id" BIGSERIAL NOT NULL,
    "approved_at" TIMESTAMP(6),
    "client_name" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "status" VARCHAR(20),
    "title" VARCHAR(200) NOT NULL,
    "viewed_at" TIMESTAMP(6),

    CONSTRAINT "delivery_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_items" (
    "id" BIGSERIAL NOT NULL,
    "added_at" TIMESTAMP(6) NOT NULL,
    "added_by_id" BIGINT,
    "display_order" INTEGER NOT NULL,
    "ends_at" DATE,
    "starts_at" DATE,
    "photo_id" BIGINT NOT NULL,

    CONSTRAINT "featured_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_participants" (
    "id" BIGSERIAL NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "joined_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL,

    CONSTRAINT "gathering_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_photos" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_post_id" BIGINT NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "gathering_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_post_comments" (
    "id" BIGSERIAL NOT NULL,
    "gathering_post_id" BIGINT NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "gathering_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_post_likes" (
    "id" BIGSERIAL NOT NULL,
    "gathering_post_id" BIGINT NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "gathering_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_posts" (
    "id" BIGSERIAL NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "hashtags" VARCHAR(300),
    "member_id" BIGINT NOT NULL,
    "member_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "gathering_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gatherings" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "created_by" BIGINT NOT NULL,
    "description" TEXT,
    "end_date_time" TIMESTAMP(6) NOT NULL,
    "location" VARCHAR(300) NOT NULL,
    "max_participants" INTEGER NOT NULL,
    "recruitment_end_date_time" TIMESTAMP(6) NOT NULL,
    "shoot_theme" VARCHAR(200),
    "start_date_time" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "title" VARCHAR(200) NOT NULL,

    CONSTRAINT "gatherings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" BIGSERIAL NOT NULL,
    "budget" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL,
    "is_read" BOOLEAN NOT NULL,
    "message" TEXT,
    "process_status" VARCHAR(255) NOT NULL,
    "sender_email" VARCHAR(255),
    "sender_name" VARCHAR(255),
    "shoot_date" DATE,
    "shoot_type" VARCHAR(255),
    "receiver_id" BIGINT,
    "sender_id" BIGINT,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meets" (
    "id" BIGSERIAL NOT NULL,
    "confirmed_date" DATE,
    "created_at" TIMESTAMP(6) NOT NULL,
    "receiver_id" BIGINT NOT NULL,
    "requester_id" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "meets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" BIGSERIAL NOT NULL,
    "authority" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "is_verified" BOOLEAN NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "profile_name" VARCHAR(255),
    "provider" VARCHAR(255),
    "provider_id" VARCHAR(255),
    "status" VARCHAR(255) NOT NULL,
    "suspend_reason" VARCHAR(500),
    "suspend_until" TIMESTAMP(6),
    "suspended_at" TIMESTAMP(6),
    "suspended_by_id" BIGINT,
    "tel" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "verified_at" TIMESTAMP(6),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "subscribed_at" TIMESTAMP(6) NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "unsubscribed_at" TIMESTAMP(6),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" BIGSERIAL NOT NULL,
    "author_id" BIGINT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "expires_at" TIMESTAMP(6),
    "is_pinned" BOOLEAN NOT NULL,
    "published_at" TIMESTAMP(6),
    "status" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_categories" (
    "id" BIGSERIAL NOT NULL,
    "is_active" BOOLEAN,
    "code" VARCHAR(2) NOT NULL,
    "level" INTEGER NOT NULL,
    "name_en" VARCHAR(20),
    "name_ko" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER,

    CONSTRAINT "photo_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" BIGSERIAL NOT NULL,
    "category_code" VARCHAR(10),
    "color_mood" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "image_url" VARCHAR(255),
    "likes_count" INTEGER NOT NULL,
    "saves_count" INTEGER NOT NULL,
    "shares_count" INTEGER NOT NULL,
    "thumbnail_url" VARCHAR(255),
    "title" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "popups" (
    "id" BIGSERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "ends_at" TIMESTAMP(6),
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL,
    "link_url" VARCHAR(500),
    "show_once" BOOLEAN NOT NULL,
    "starts_at" TIMESTAMP(6),
    "target_screen" VARCHAR(20) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "popups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" BIGSERIAL NOT NULL,
    "display_order" INTEGER,
    "is_featured" BOOLEAN,
    "item_type" VARCHAR(10) NOT NULL,
    "section_name" VARCHAR(50),
    "photo_id" BIGINT,
    "portfolio_id" BIGINT NOT NULL,
    "series_id" BIGINT,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" BIGSERIAL NOT NULL,
    "admin_note" TEXT,
    "category_code" VARCHAR(10),
    "cover_image_url" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL,
    "description" TEXT,
    "likes_count" INTEGER,
    "is_pinned" BOOLEAN,
    "published_at" TIMESTAMP(6),
    "reviewed_at" TIMESTAMP(6),
    "status" VARCHAR(255) NOT NULL,
    "subtitle" VARCHAR(200),
    "tags" VARCHAR(500),
    "title" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "view_count" INTEGER,
    "visibility" VARCHAR(255) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "reviewed_by" BIGINT,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "press_features" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "logo_url" VARCHAR(500),
    "member_id" BIGINT NOT NULL,
    "publication" VARCHAR(100) NOT NULL,
    "published_date" VARCHAR(20),
    "title" VARCHAR(200),
    "url" VARCHAR(500),

    CONSTRAINT "press_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_packages" (
    "id" BIGSERIAL NOT NULL,
    "active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL,
    "features" TEXT,
    "member_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price" INTEGER,
    "price_label" VARCHAR(50),

    CONSTRAINT "pricing_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" BIGSERIAL NOT NULL,
    "ai_analyzed_at" TIMESTAMP(6),
    "ai_severity" VARCHAR(20),
    "ai_suggested_action" VARCHAR(20),
    "ai_summary" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL,
    "details" VARCHAR(500),
    "process_memo" VARCHAR(500),
    "processed_at" TIMESTAMP(6),
    "processed_by_id" BIGINT,
    "reason" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "target_id" BIGINT NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "reporter_id" BIGINT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_audit_log" (
    "id" BIGSERIAL NOT NULL,
    "action_detail" VARCHAR(500),
    "action_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "error_message" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "member_id" BIGINT,
    "role" VARCHAR(10),
    "success" BOOLEAN NOT NULL,

    CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" BIGSERIAL NOT NULL,
    "cover_image_url" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "draft" BOOLEAN,
    "featured_at" TIMESTAMP(6),
    "likes_count" INTEGER NOT NULL,
    "shoot_type" VARCHAR(30),
    "title" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "view_count" INTEGER NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_photos" (
    "id" BIGSERIAL NOT NULL,
    "display_order" INTEGER NOT NULL,
    "photo_id" BIGINT NOT NULL,
    "series_id" BIGINT NOT NULL,

    CONSTRAINT "series_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "config_key" VARCHAR(100) NOT NULL,
    "description" VARCHAR(200),
    "updated_at" TIMESTAMP(6),
    "config_value" TEXT NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("config_key")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" BIGSERIAL NOT NULL,
    "client_name" VARCHAR(100) NOT NULL,
    "client_role" VARCHAR(100),
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL,
    "member_id" BIGINT NOT NULL,
    "series_id" BIGINT,
    "shoot_date" VARCHAR(20),

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" BIGSERIAL NOT NULL,
    "bio" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL,
    "portfolio_url" VARCHAR(500),
    "reject_reason" VARCHAR(500),
    "reviewed_at" TIMESTAMP(6),
    "reviewed_by_id" BIGINT,
    "status" VARCHAR(20) NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_admin_activity_logs_created_at" ON "admin_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_admin_member_notes_member" ON "admin_member_notes"("member_id");

-- CreateIndex
CREATE INDEX "idx_privacy_logs_accessed_at" ON "admin_privacy_access_logs"("accessed_at");

-- CreateIndex
CREATE INDEX "idx_privacy_logs_subject" ON "admin_privacy_access_logs"("subject_member_id");

-- CreateIndex
CREATE INDEX "idx_bookings_shoot_date_status" ON "bookings"("shoot_date", "status");

-- CreateIndex
CREATE INDEX "idx_comments_parent_id" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "idx_comments_photo_id" ON "comments"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk9d30a9u1qpg8eou0otgkwrp5d" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uksc7nu0i3lec93dlnsrdjejp4u" ON "members"("profile_name");

-- CreateIndex
CREATE UNIQUE INDEX "ukh0onykosbrrffkms10ckkt6hs" ON "newsletter_subscribers"("token");

-- CreateIndex
CREATE UNIQUE INDEX "uk4k0umvo30800jaow1n678ahlj" ON "photo_categories"("level", "code");

-- CreateIndex
CREATE INDEX "idx_audit_member" ON "security_audit_log"("member_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk5xoo2fato6truo0dig4bijdqg" FOREIGN KEY ("photographer_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fkdrd192k5f0i7qirf0dg71s9yy" FOREIGN KEY ("client_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "fk4fuvkrhbvpt87m2028pb9e03c" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "featured_items" ADD CONSTRAINT "fkfdwhf25ya34rerf6hidexdnap" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "fk1mxm0wst1aowtt77wrn7paw8v" FOREIGN KEY ("receiver_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "fkpp19cx6vcp4hv4ye1p4laotul" FOREIGN KEY ("sender_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "fk61ogpnl4cfrqebg7bqdi2vtjf" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "fk2n7qvibau84oje8if0xlfmfrh" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "fkdgqo4wge6ujhp6gl7bx9mhekf" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "fkmkd3xsfvbvnj0k7akoleedr40" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "fkfptn2etfhsob5raqmuhg03xw9" FOREIGN KEY ("reviewed_by") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "fkonyc71oyvfe6f7u5ut93hwfbf" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "fkstudkqwdqpfvo0xkc8kg8e5fb" FOREIGN KEY ("reporter_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "fk9vdt246k8t9ba8jvqf3cnh3c6" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "series_photos" ADD CONSTRAINT "fkj8y1prauf5udy0j8yaevxv39i" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "series_photos" ADD CONSTRAINT "fknklmqtvt03g6krta3equah8uq" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "fkpl9i82b89jot1rgtjhyfh0xth" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
