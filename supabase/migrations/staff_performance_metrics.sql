-- Create a view to calculate staff performance metrics
-- This aggregates movements data to show deals closed, revenue, avg deal value, conversion rate

create or replace view public.staff_performance_metrics as
select
  sm.id as staff_id,
  sm.name as staff_name,
  sm.role,
  sm.branch_name as branch,
  sm.agency_id,
  
  -- Count completed deals (movements with status 'completed' or 'exchanged')
  count(distinct m.id) filter (
    where m.status in ('completed', 'exchanged', 'sale')
  ) as deals_closed,
  
  -- Total revenue from completed deals
  coalesce(sum(m.price) filter (
    where m.status in ('completed', 'exchanged', 'sale')
  ), 0) as total_revenue,
  
  -- Average deal value
  coalesce(avg(m.price) filter (
    where m.status in ('completed', 'exchanged', 'sale')
  ), 0) as avg_deal_value,
  
  -- Total movements (for conversion rate calculation)
  count(distinct m.id) as total_movements,
  
  -- Conversion rate (completed deals / total movements)
  case
    when count(distinct m.id) > 0 then
      count(distinct m.id) filter (
        where m.status in ('completed', 'exchanged', 'sale')
      )::numeric / count(distinct m.id)::numeric
    else 0
  end as conversion_rate

from public.staff_members sm
left join public.movements m on lower(m.agent) = lower(sm.name) and m.agency_id = sm.agency_id
group by sm.id, sm.name, sm.role, sm.branch_name, sm.agency_id;

-- Grant select permissions to authenticated users
grant select on public.staff_performance_metrics to authenticated;

-- RLS policy: users can only see metrics for their own agency
alter view public.staff_performance_metrics set (security_invoker = on);
