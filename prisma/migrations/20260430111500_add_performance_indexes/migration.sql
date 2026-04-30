CREATE INDEX "Jobs_postedAtUtc_lastFetchedAt_idx" ON "Jobs"("postedAtUtc", "lastFetchedAt");
CREATE INDEX "Jobs_lastFetchedAt_idx" ON "Jobs"("lastFetchedAt");

CREATE INDEX "JobApplication_userId_appliedAt_idx" ON "JobApplication"("userId", "appliedAt");
CREATE INDEX "JobApplication_userId_statusId_interviewDate_idx" ON "JobApplication"("userId", "statusId", "interviewDate");

CREATE INDEX "RoleAlias_roleId_idx" ON "RoleAlias"("roleId");
CREATE INDEX "SkillAlias_skillId_idx" ON "SkillAlias"("skillId");
