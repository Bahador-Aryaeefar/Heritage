-- Replace heritage-era categories with Kermanshah tourism taxonomy.
CREATE TYPE "SiteCategory_new" AS ENUM ('HISTORICAL', 'HANDICRAFT', 'STREET', 'LANDMARK', 'FOOD');

ALTER TABLE "Site" ALTER COLUMN "category" TYPE "SiteCategory_new" USING (
  CASE "category"::text
    WHEN 'ANCIENT' THEN 'HISTORICAL'::"SiteCategory_new"
    WHEN 'ISLAMIC' THEN 'HISTORICAL'::"SiteCategory_new"
    WHEN 'NATURAL' THEN 'LANDMARK'::"SiteCategory_new"
    ELSE 'HISTORICAL'::"SiteCategory_new"
  END
);

DROP TYPE "SiteCategory";
ALTER TYPE "SiteCategory_new" RENAME TO "SiteCategory";

-- Handicraft and food entries may omit a single map pin for now.
ALTER TABLE "Site" ALTER COLUMN "lat" DROP NOT NULL;
ALTER TABLE "Site" ALTER COLUMN "lng" DROP NOT NULL;

-- LIST blocks for recipes and step-by-step content.
ALTER TYPE "ContentBlockType" ADD VALUE 'LIST';

CREATE TYPE "ListStyle" AS ENUM ('BULLET', 'NUMBERED');

ALTER TABLE "SiteContentBlock" ADD COLUMN "listStyle" "ListStyle";
