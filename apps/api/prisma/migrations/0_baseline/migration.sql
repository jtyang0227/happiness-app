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
CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "event_type" VARCHAR(30) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "target_id" BIGINT,
    "target_type" VARCHAR(20),
    "visitor_token" VARCHAR(32),

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "booking_availability" (
    "id" BIGSERIAL NOT NULL,
    "booking_note" TEXT,
    "buffer_hours" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "member_id" BIGINT NOT NULL,
    "time_slots" VARCHAR(100),
    "updated_at" TIMESTAMP(6),
    "weekdays" VARCHAR(20),

    CONSTRAINT "booking_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_blocked_dates" (
    "id" BIGSERIAL NOT NULL,
    "blocked_date" DATE NOT NULL,
    "member_id" BIGINT NOT NULL,
    "reason" VARCHAR(100),

    CONSTRAINT "booking_blocked_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" BIGSERIAL NOT NULL,
    "balance_amount" INTEGER,
    "balance_received_at" TIMESTAMP(6),
    "balance_status" VARCHAR(20),
    "cancelled_at" TIMESTAMP(6),
    "checklist_json" TEXT,
    "client_email" VARCHAR(255),
    "client_name" VARCHAR(100) NOT NULL,
    "client_phone" VARCHAR(30),
    "confirmed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL,
    "delivery_deadline" DATE,
    "deposit_amount" INTEGER,
    "deposit_received_at" TIMESTAMP(6),
    "deposit_status" VARCHAR(20),
    "member_id" BIGINT NOT NULL,
    "memo" TEXT,
    "reject_reason" VARCHAR(200),
    "shoot_date" DATE NOT NULL,
    "shoot_time" VARCHAR(10),
    "shoot_type" VARCHAR(20),
    "status" VARCHAR(20),

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
CREATE TABLE "delivery_set_photos" (
    "delivery_set_id" BIGINT NOT NULL,
    "photo_id" BIGINT NOT NULL,
    "liked" BOOLEAN NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "delivery_set_photos_pkey" PRIMARY KEY ("delivery_set_id","photo_id")
);

-- CreateTable
CREATE TABLE "delivery_sets" (
    "id" BIGSERIAL NOT NULL,
    "approved_at" TIMESTAMP(6),
    "client_name" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "feedback" TEXT,
    "member_id" BIGINT NOT NULL,
    "password_hash" VARCHAR(255),
    "status" VARCHAR(20),
    "title" VARCHAR(200) NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "viewed_at" TIMESTAMP(6),

    CONSTRAINT "delivery_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "follower_id" BIGINT NOT NULL,
    "following_id" BIGINT NOT NULL,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_notifications" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "is_read" BOOLEAN NOT NULL,
    "member_id" BIGINT NOT NULL,
    "message" VARCHAR(300) NOT NULL,
    "related_post_id" BIGINT,
    "type" VARCHAR(30) NOT NULL,

    CONSTRAINT "gathering_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_participants" (
    "id" BIGSERIAL NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "joined_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "reason" VARCHAR(200),
    "status" VARCHAR(20) NOT NULL,

    CONSTRAINT "gathering_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_photos" (
    "id" BIGSERIAL NOT NULL,
    "caption" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_post_id" BIGINT NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "gathering_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_place_options" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "spot_id" BIGINT,

    CONSTRAINT "gathering_place_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_place_votes" (
    "id" BIGSERIAL NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "member_id" BIGINT NOT NULL,
    "option_id" BIGINT NOT NULL,
    "voted_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "gathering_place_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_post_comments" (
    "id" BIGSERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_post_id" BIGINT NOT NULL,
    "member_avatar_url" VARCHAR(500),
    "member_id" BIGINT NOT NULL,
    "member_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "gathering_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_post_likes" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
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
    "member_avatar_url" VARCHAR(500),
    "member_id" BIGINT NOT NULL,
    "member_name" VARCHAR(100) NOT NULL,
    "wants_feedback" BOOLEAN,

    CONSTRAINT "gathering_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gatherings" (
    "id" BIGSERIAL NOT NULL,
    "beginner_friendly" BOOLEAN,
    "created_at" TIMESTAMP(6) NOT NULL,
    "created_by" BIGINT NOT NULL,
    "description" TEXT,
    "detail_description" TEXT,
    "end_date_time" TIMESTAMP(6) NOT NULL,
    "fee" VARCHAR(100),
    "hashtags" VARCHAR(300),
    "location" VARCHAR(300) NOT NULL,
    "location_intro" TEXT,
    "max_participants" INTEGER NOT NULL,
    "portrait_consent_rule" BOOLEAN,
    "preparation_note" TEXT,
    "recruitment_end_date_time" TIMESTAMP(6) NOT NULL,
    "reference_image_url" VARCHAR(500),
    "shoot_theme" VARCHAR(200),
    "spot_id" BIGINT,
    "start_date_time" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "title" VARCHAR(200) NOT NULL,

    CONSTRAINT "gatherings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" BIGSERIAL NOT NULL,
    "budget" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL,
    "is_read" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "receiver_member_id" BIGINT NOT NULL,
    "sender_email" VARCHAR(100) NOT NULL,
    "sender_name" VARCHAR(50) NOT NULL,
    "shoot_date" VARCHAR(50),
    "shoot_type" VARCHAR(20),
    "source_series_id" BIGINT,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_story_shares" (
    "id" BIGSERIAL NOT NULL,
    "caption_text" VARCHAR(300),
    "gathering_id" BIGINT NOT NULL,
    "gathering_post_id" BIGINT,
    "member_id" BIGINT NOT NULL,
    "shared_at" TIMESTAMP(6) NOT NULL,
    "tagged_member_ids" VARCHAR(500),
    "template" VARCHAR(30) NOT NULL,

    CONSTRAINT "instagram_story_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meet_availabilities" (
    "id" BIGSERIAL NOT NULL,
    "available_dates" TEXT,
    "available_times" TEXT,
    "meet_id" BIGINT NOT NULL,
    "member_id" BIGINT NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "meet_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meet_messages" (
    "id" BIGSERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "meet_id" BIGINT NOT NULL,
    "sender_avatar" VARCHAR(500),
    "sender_id" BIGINT NOT NULL,
    "sender_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "meet_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meets" (
    "id" BIGSERIAL NOT NULL,
    "confirmed_date" DATE,
    "confirmed_time" VARCHAR(10),
    "created_at" TIMESTAMP(6) NOT NULL,
    "initial_message" TEXT,
    "location_address" VARCHAR(400),
    "location_lat" DOUBLE PRECISION,
    "location_lng" DOUBLE PRECISION,
    "location_name" VARCHAR(200),
    "receiver_id" BIGINT NOT NULL,
    "requester_id" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "meets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_blocks" (
    "id" BIGSERIAL NOT NULL,
    "blocked_id" BIGINT NOT NULL,
    "blocker_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "member_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" BIGSERIAL NOT NULL,
    "authority" VARCHAR(255) NOT NULL,
    "avatar_url" VARCHAR(500),
    "bio" TEXT,
    "cover_url" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_notifications" BOOLEAN NOT NULL,
    "instagram_id" VARCHAR(50),
    "location" VARCHAR(100),
    "name" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "portfolio_cover_photo_id" BIGINT,
    "portfolio_layout" VARCHAR(20),
    "portfolio_sections_json" TEXT,
    "portfolio_style_json" TEXT,
    "portfolio_template" VARCHAR(20),
    "profile_name" VARCHAR(30),
    "provider" VARCHAR(255),
    "provider_id" VARCHAR(255),
    "public_profile" BOOLEAN NOT NULL,
    "specialties" VARCHAR(300),
    "status" VARCHAR(255) NOT NULL,
    "tel" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "website_url" VARCHAR(300),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboard_items" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "moodboard_id" BIGINT NOT NULL,
    "photo_id" BIGINT NOT NULL,

    CONSTRAINT "moodboard_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moodboards" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "share_token" VARCHAR(32),
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "moodboards_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "password_reset_tokens" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "used_at" TIMESTAMP(6),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_likes" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "photo_id" BIGINT NOT NULL,

    CONSTRAINT "photo_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_saves" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "photo_id" BIGINT NOT NULL,

    CONSTRAINT "photo_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_shares" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "photo_id" BIGINT NOT NULL,
    "platform" VARCHAR(255) NOT NULL,

    CONSTRAINT "photo_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_spots" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "photo_id" BIGINT NOT NULL,
    "spot_id" BIGINT NOT NULL,

    CONSTRAINT "photo_spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_tags" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "member_name" VARCHAR(255) NOT NULL,
    "photo_id" BIGINT NOT NULL,
    "positionx" DOUBLE PRECISION,
    "positiony" DOUBLE PRECISION,

    CONSTRAINT "photo_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" BIGSERIAL NOT NULL,
    "aperture" VARCHAR(20),
    "blur_hash" VARCHAR(500),
    "camera_model" VARCHAR(100),
    "color_mood" VARCHAR(255),
    "color_palette" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL,
    "description" TEXT,
    "display_order" INTEGER,
    "dominant_color" VARCHAR(255),
    "focal_length" VARCHAR(20),
    "genre" VARCHAR(20),
    "grid_col_span" INTEGER NOT NULL,
    "image_ratio" VARCHAR(255) NOT NULL,
    "image_right" BOOLEAN,
    "image_url" VARCHAR(255) NOT NULL,
    "iso" INTEGER,
    "lens_model" VARCHAR(100),
    "likes_count" INTEGER NOT NULL,
    "magazine_caption" TEXT,
    "member_id" BIGINT NOT NULL,
    "pan_type" VARCHAR(20),
    "saves_count" INTEGER NOT NULL,
    "shares_count" INTEGER NOT NULL,
    "shutter_speed" VARCHAR(20),
    "sub_genres" VARCHAR(60),
    "thumbnail_url" VARCHAR(255),
    "title" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
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
    "comment_id" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL,
    "detail" TEXT,
    "evidence_url" VARCHAR(500),
    "photo_id" BIGINT NOT NULL,
    "reason" VARCHAR(30) NOT NULL,
    "reporter_id" BIGINT NOT NULL,
    "reporter_seen" BOOLEAN NOT NULL,
    "resolution_note" VARCHAR(300),
    "resolved_at" TIMESTAMP(6),
    "status" VARCHAR(20) NOT NULL,

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
    "client_label" VARCHAR(100),
    "cover_image_url" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL,
    "credits_json" TEXT,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "draft" BOOLEAN,
    "featured_at" TIMESTAMP(6),
    "member_id" BIGINT NOT NULL,
    "pinned" BOOLEAN,
    "shoot_type" VARCHAR(30),
    "shot_on" VARCHAR(7),
    "story" TEXT,
    "title" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_appreciations" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "series_id" BIGINT NOT NULL,

    CONSTRAINT "series_appreciations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_photos" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "photo_id" BIGINT NOT NULL,
    "series_id" BIGINT NOT NULL,

    CONSTRAINT "series_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spots" (
    "id" BIGSERIAL NOT NULL,
    "address" VARCHAR(200),
    "best_time" VARCHAR(30),
    "created_at" TIMESTAMP(6) NOT NULL,
    "created_by" BIGINT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "region" VARCHAR(30),
    "tips" TEXT,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "spots_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "gathering_ai_recommendations" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "member_id" BIGINT NOT NULL,
    "model" VARCHAR(60),
    "question" VARCHAR(500),
    "result_json" TEXT NOT NULL,
    "source" VARCHAR(10) NOT NULL,

    CONSTRAINT "gathering_ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_best_votes" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "member_id" BIGINT NOT NULL,
    "photo_id" BIGINT NOT NULL,

    CONSTRAINT "gathering_best_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gathering_stories" (
    "id" BIGSERIAL NOT NULL,
    "caption" VARCHAR(300),
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "tagged_member_ids" VARCHAR(500),

    CONSTRAINT "gathering_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outing_poll_options" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "day_kind" VARCHAR(10) NOT NULL,
    "label" VARCHAR(50),
    "option_date" DATE NOT NULL,
    "poll_id" BIGINT NOT NULL,

    CONSTRAINT "outing_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outing_poll_votes" (
    "id" BIGSERIAL NOT NULL,
    "availability" VARCHAR(12) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "option_id" BIGINT NOT NULL,
    "poll_id" BIGINT NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "outing_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outing_polls" (
    "id" BIGSERIAL NOT NULL,
    "closing_notified" BOOLEAN,
    "confirmed_option_id" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL,
    "created_by" BIGINT NOT NULL,
    "description" TEXT,
    "ends_at" TIMESTAMP(6) NOT NULL,
    "gathering_id" BIGINT,
    "max_participants" INTEGER,
    "min_participants" INTEGER,
    "poll_month" INTEGER NOT NULL,
    "region" VARCHAR(50),
    "starts_at" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "poll_year" INTEGER NOT NULL,

    CONSTRAINT "outing_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "holiday_date" DATE NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "source" VARCHAR(10) NOT NULL,
    "substitute" BOOLEAN,

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_achievements_member_id" ON "achievements"("member_id");

-- CreateIndex
CREATE INDEX "idx_analytics_created_at" ON "analytics_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_analytics_member_type" ON "analytics_events"("member_id", "event_type");

-- CreateIndex
CREATE INDEX "idx_analytics_member_type_created" ON "analytics_events"("member_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "idx_analytics_target" ON "analytics_events"("target_type", "target_id", "event_type");

-- CreateIndex
CREATE INDEX "idx_analytics_visitor_token" ON "analytics_events"("visitor_token", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uksdrqmlekkih69ap90lfos9sa4" ON "booking_availability"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "ukom1nabvbeq9gphni5wgvjuvus" ON "booking_blocked_dates"("member_id", "blocked_date");

-- CreateIndex
CREATE INDEX "idx_bookings_member_shoot_date" ON "bookings"("member_id", "shoot_date");

-- CreateIndex
CREATE INDEX "idx_bookings_status_shoot_date" ON "bookings"("status", "shoot_date");

-- CreateIndex
CREATE INDEX "idx_client_brands_member_id" ON "client_brands"("member_id");

-- CreateIndex
CREATE INDEX "idx_comments_parent_id" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "idx_comments_photo_id" ON "comments"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "ukcjugk1vy52qr9xx68c281otd8" ON "delivery_sets"("token");

-- CreateIndex
CREATE INDEX "idx_delivery_sets_member_id" ON "delivery_sets"("member_id");

-- CreateIndex
CREATE INDEX "idx_follows_following_id" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk4faelgsm2rxl2jf3iyjy981ro" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "idx_gn_created_at" ON "gathering_notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_gn_member_read" ON "gathering_notifications"("member_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_gathering_participants_gathering" ON "gathering_participants"("gathering_id", "status");

-- CreateIndex
CREATE INDEX "idx_gathering_participants_member" ON "gathering_participants"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_gathering_member" ON "gathering_participants"("gathering_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_gathering_photos_post_id" ON "gathering_photos"("gathering_post_id");

-- CreateIndex
CREATE INDEX "idx_gpo_gathering" ON "gathering_place_options"("gathering_id");

-- CreateIndex
CREATE INDEX "idx_gpv_option" ON "gathering_place_votes"("option_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_gpv_gathering_member" ON "gathering_place_votes"("gathering_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_gathering_post_comments_post_id" ON "gathering_post_comments"("gathering_post_id");

-- CreateIndex
CREATE INDEX "idx_gathering_post_likes_post_id" ON "gathering_post_likes"("gathering_post_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_gathering_post_like" ON "gathering_post_likes"("gathering_post_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_gathering_posts_gathering_id" ON "gathering_posts"("gathering_id");

-- CreateIndex
CREATE INDEX "idx_gathering_posts_member_id" ON "gathering_posts"("member_id");

-- CreateIndex
CREATE INDEX "idx_gatherings_created_by" ON "gatherings"("created_by");

-- CreateIndex
CREATE INDEX "idx_gatherings_start_date" ON "gatherings"("start_date_time");

-- CreateIndex
CREATE INDEX "idx_gatherings_status" ON "gatherings"("status");

-- CreateIndex
CREATE INDEX "idx_inquiries_receiver_member_id" ON "inquiries"("receiver_member_id");

-- CreateIndex
CREATE INDEX "idx_instagram_shares_gathering" ON "instagram_story_shares"("gathering_id");

-- CreateIndex
CREATE INDEX "idx_instagram_shares_member" ON "instagram_story_shares"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk8ur97a54d468wd59jicga222s" ON "meet_availabilities"("meet_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_meet_messages_meet_id" ON "meet_messages"("meet_id");

-- CreateIndex
CREATE INDEX "idx_meets_receiver" ON "meets"("receiver_id");

-- CreateIndex
CREATE INDEX "idx_meets_requester" ON "meets"("requester_id");

-- CreateIndex
CREATE INDEX "idx_member_blocks_blocked_id" ON "member_blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "uknaluyibog40pgd662axp5fse8" ON "member_blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk9d30a9u1qpg8eou0otgkwrp5d" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uksc7nu0i3lec93dlnsrdjejp4u" ON "members"("profile_name");

-- CreateIndex
CREATE INDEX "idx_members_provider" ON "members"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "idx_moodboard_items_photo" ON "moodboard_items"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "ukdsmbf98shkovbhijaxis0we51" ON "moodboard_items"("moodboard_id", "photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_moodboards_share_token" ON "moodboards"("share_token");

-- CreateIndex
CREATE INDEX "idx_moodboards_member" ON "moodboards"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "ukh0onykosbrrffkms10ckkt6hs" ON "newsletter_subscribers"("token");

-- CreateIndex
CREATE UNIQUE INDEX "uketsi5wpynjancgu4ku4a5gxvy" ON "newsletter_subscribers"("member_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ukajre85ybxavf1tt4omkrs5p6g" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_member" ON "password_reset_tokens"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "ukqay2plmv9nproixw6pndpqhdd" ON "photo_likes"("photo_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_photo_saves_member_id" ON "photo_saves"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk1ygk5hf0ustksn3c5xqnig07w" ON "photo_saves"("photo_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_photo_shares_photo_id" ON "photo_shares"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_photo_spots_photo" ON "photo_spots"("photo_id");

-- CreateIndex
CREATE INDEX "idx_photo_spots_spot" ON "photo_spots"("spot_id");

-- CreateIndex
CREATE INDEX "idx_photo_tags_photo_id" ON "photo_tags"("photo_id");

-- CreateIndex
CREATE INDEX "idx_photos_color_mood" ON "photos"("color_mood");

-- CreateIndex
CREATE INDEX "idx_photos_genre" ON "photos"("genre");

-- CreateIndex
CREATE INDEX "idx_photos_member_created" ON "photos"("member_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_press_features_member_id" ON "press_features"("member_id");

-- CreateIndex
CREATE INDEX "idx_pricing_packages_member_id" ON "pricing_packages"("member_id");

-- CreateIndex
CREATE INDEX "idx_reports_photo_id" ON "reports"("photo_id");

-- CreateIndex
CREATE INDEX "idx_reports_reporter_id" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "idx_reports_status" ON "reports"("status");

-- CreateIndex
CREATE INDEX "idx_audit_member" ON "security_audit_log"("member_id");

-- CreateIndex
CREATE INDEX "idx_series_member_id" ON "series"("member_id");

-- CreateIndex
CREATE INDEX "idx_series_appreciations_member" ON "series_appreciations"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "ukn0tup30ughhf32dwxx3vbgtwx" ON "series_appreciations"("series_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk60nkpyvhp4g2bx4eh4mgsjuy5" ON "series_photos"("series_id", "photo_id");

-- CreateIndex
CREATE INDEX "idx_spots_created_by" ON "spots"("created_by");

-- CreateIndex
CREATE INDEX "idx_spots_lat_lng" ON "spots"("lat", "lng");

-- CreateIndex
CREATE INDEX "idx_spots_region" ON "spots"("region");

-- CreateIndex
CREATE INDEX "idx_testimonials_member_id" ON "testimonials"("member_id");

-- CreateIndex
CREATE INDEX "idx_gar_gathering" ON "gathering_ai_recommendations"("gathering_id");

-- CreateIndex
CREATE INDEX "idx_gbv_gathering_member" ON "gathering_best_votes"("gathering_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_gathering_best_votes" ON "gathering_best_votes"("photo_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_gathering_stories_gathering" ON "gathering_stories"("gathering_id");

-- CreateIndex
CREATE INDEX "idx_gathering_stories_member" ON "gathering_stories"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_outing_poll_options" ON "outing_poll_options"("poll_id", "option_date");

-- CreateIndex
CREATE INDEX "idx_opv_poll_member" ON "outing_poll_votes"("poll_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_outing_poll_votes" ON "outing_poll_votes"("option_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_outing_polls_month" ON "outing_polls"("poll_year", "poll_month");

-- CreateIndex
CREATE UNIQUE INDEX "uk_public_holidays_date" ON "public_holidays"("holiday_date");

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "fk4fuvkrhbvpt87m2028pb9e03c" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
