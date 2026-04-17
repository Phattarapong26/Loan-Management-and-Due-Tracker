-- Add year-based interest tier support to loan_products table
-- This migration adds support for flexible tiered interest rates based on loan years

-- Add new enum value for TIERED interest rate type
ALTER TYPE "InterestRateType" ADD VALUE IF NOT EXISTS 'TIERED';

-- Create new table for year-based interest tiers
CREATE TABLE IF NOT EXISTS "year_interest_tiers" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "loan_product_id" TEXT NOT NULL,
  "tier_type" TEXT NOT NULL CHECK (tier_type IN ('FIXED', 'VARIABLE')),
  "start_year" INTEGER NOT NULL CHECK (start_year >= 1),
  "end_year" TEXT NOT NULL, -- Can be a number or 'END'
  "rate" DECIMAL(5,4), -- For FIXED type
  "formula" TEXT, -- For VARIABLE type (e.g., 'MLR + 1.5%')
  "min_rate" DECIMAL(5,4), -- Floor rate for VARIABLE
  "max_rate" DECIMAL(5,4), -- Cap rate for VARIABLE
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "year_interest_tiers_loan_product_id_fkey" 
    FOREIGN KEY ("loan_product_id") 
    REFERENCES "loan_products"("id") 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "year_interest_tiers_loan_product_id_idx" 
  ON "year_interest_tiers"("loan_product_id");

CREATE INDEX IF NOT EXISTS "year_interest_tiers_start_year_idx" 
  ON "year_interest_tiers"("start_year");

-- Add comment
COMMENT ON TABLE "year_interest_tiers" IS 'Year-based interest rate tiers for flexible loan products';
COMMENT ON COLUMN "year_interest_tiers"."tier_type" IS 'FIXED for fixed rate, VARIABLE for floating rate';
COMMENT ON COLUMN "year_interest_tiers"."end_year" IS 'End year as number or END for until loan maturity';
COMMENT ON COLUMN "year_interest_tiers"."formula" IS 'Interest rate formula for VARIABLE type (e.g., MLR + 1.5%)';
