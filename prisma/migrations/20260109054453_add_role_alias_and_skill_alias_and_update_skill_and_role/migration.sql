-- CreateTable
CREATE TABLE "RoleAlias" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "RoleAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillAlias" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "SkillAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleAlias_alias_key" ON "RoleAlias"("alias");

-- CreateIndex
CREATE INDEX "RoleAlias_alias_idx" ON "RoleAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "SkillAlias_alias_key" ON "SkillAlias"("alias");

-- CreateIndex
CREATE INDEX "SkillAlias_alias_idx" ON "SkillAlias"("alias");

-- AddForeignKey
ALTER TABLE "RoleAlias" ADD CONSTRAINT "RoleAlias_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAlias" ADD CONSTRAINT "SkillAlias_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
