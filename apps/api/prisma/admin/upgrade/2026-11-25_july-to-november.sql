-- 어드민 스키마 업그레이드 — 운영(happiness-admin master c35e964, 2026-07 배포) → 새 어드민 API(apps/api 어드민 진입점)가 기대하는 스키마
--
-- 왜 필요한가: 운영 Spring 어드민은 7월 코드라 표 19개뿐이다. 새 어드민 API는 11월 브랜치(cfecd55)를 옮긴 것이라 표 37개·열 몇 개를
-- 더 쓴다. Prisma는 Hibernate(ddl-auto)처럼 표를 만들지 않으므로, 새 어드민 API를 띄우기 **전에** 이 SQL을 한 번 실행한다.
-- 만든 법: 7월 jar로 빈 스키마 생성 → `prisma migrate diff`(7월 → prisma/admin/schema.prisma) → 아래 손질.
--   · 기존 행이 있어도 되도록 NOT NULL 추가 열에 DEFAULT(문의 처리 상태 NEW, 시리즈 좋아요·조회 0)
--   · Prisma가 다루지 않는 CHECK 제약(문의 처리 상태) 추가
--   · 전부 IF NOT EXISTS — 여러 번 실행해도 안전. DROP·열 변경 없음(추가만).
-- 실행: Supabase SQL Editor 또는 psql. 스키마 이름이 admin이 아니면 아래 search_path를 운영 DB_SCHEMA 값으로 바꾼다.
-- 확인(2026-11-25, 로컬 PostgreSQL 16): 7월 스키마 + 행 있음 → 이 SQL 2회 → 11월 스키마와 열·인덱스·CHECK 동일, 어드민 계약 테스트 통과.

BEGIN;
SET LOCAL search_path TO admin;

-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN IF NOT EXISTS "process_status" VARCHAR(255) NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "ai_analyzed_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "ai_severity" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "ai_suggested_action" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "ai_summary" VARCHAR(500);

-- AlterTable
ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "draft" BOOLEAN,
ADD COLUMN IF NOT EXISTS "featured_at" TIMESTAMP(6),
ADD COLUMN IF NOT EXISTS "likes_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "shoot_type" VARCHAR(30),
ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "achievements" (
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
CREATE TABLE IF NOT EXISTS "admin_member_notes" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" BIGINT,
    "admin_name" VARCHAR(100),
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "admin_member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin_privacy_access_logs" (
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
CREATE TABLE IF NOT EXISTS "client_brands" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "logo_url" VARCHAR(500),
    "member_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "client_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "comments" (
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
CREATE TABLE IF NOT EXISTS "delivery_sets" (
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
CREATE TABLE IF NOT EXISTS "gathering_participants" (
    "id" BIGSERIAL NOT NULL,
    "gathering_id" BIGINT NOT NULL,
    "joined_at" TIMESTAMP(6) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "status" VARCHAR(20) NOT NULL,

    CONSTRAINT "gathering_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gathering_photos" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "gathering_post_id" BIGINT NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "gathering_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gathering_post_comments" (
    "id" BIGSERIAL NOT NULL,
    "gathering_post_id" BIGINT NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "gathering_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gathering_post_likes" (
    "id" BIGSERIAL NOT NULL,
    "gathering_post_id" BIGINT NOT NULL,
    "member_id" BIGINT NOT NULL,

    CONSTRAINT "gathering_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "gathering_posts" (
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
CREATE TABLE IF NOT EXISTS "gatherings" (
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
CREATE TABLE IF NOT EXISTS "meets" (
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
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "member_id" BIGINT NOT NULL,
    "subscribed_at" TIMESTAMP(6) NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "unsubscribed_at" TIMESTAMP(6),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "press_features" (
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
CREATE TABLE IF NOT EXISTS "pricing_packages" (
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
CREATE TABLE IF NOT EXISTS "security_audit_log" (
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
CREATE TABLE IF NOT EXISTS "testimonials" (
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

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_member_notes_member" ON "admin_member_notes"("member_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_privacy_logs_accessed_at" ON "admin_privacy_access_logs"("accessed_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_privacy_logs_subject" ON "admin_privacy_access_logs"("subject_member_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_comments_parent_id" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_comments_photo_id" ON "comments"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ukh0onykosbrrffkms10ckkt6hs" ON "newsletter_subscribers"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_audit_member" ON "security_audit_log"("member_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_admin_activity_logs_created_at" ON "admin_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_bookings_shoot_date_status" ON "bookings"("shoot_date", "status");

-- CheckConstraint (Prisma가 만들지 않음 — Hibernate 11월 스키마와 같게)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_process_status_check' AND connamespace = current_schema()::regnamespace) THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_process_status_check
      CHECK (process_status IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'ON_HOLD'));
  END IF;
END $$;

COMMIT;
