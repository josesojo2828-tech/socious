-- Verify multi-subscription data integrity
SELECT 
  u."email",
  s."organizationId",
  sp.name as plan_name,
  s.status,
  s."startDate",
  s."endDate"
FROM "Subscription" s
JOIN "User" u ON u.id = s."userId"
JOIN "SubscriptionPlan" sp ON sp.id = s."planId"
ORDER BY u."email", s."organizationId";
