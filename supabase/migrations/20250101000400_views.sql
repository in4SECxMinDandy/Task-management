-- ============================================================================
-- View: employee_performance — aggregated stats used in admin dashboard.
-- ============================================================================

create or replace view public.employee_performance as
select
  p.id,
  p.full_name,
  p.email,
  p.department,
  p.is_active,
  count(t.*)                                                            as total_tasks,
  count(t.*) filter (where t.status in ('pending','in_progress'))       as in_progress_tasks,
  count(t.*) filter (where t.status = 'submitted')                      as submitted_tasks,
  count(t.*) filter (where t.status = 'approved')                       as completed_tasks,
  count(t.*) filter (where t.status = 'rejected')                       as rejected_tasks,
  count(t.*) filter (
    where t.deadline is not null
      and t.deadline < now()
      and t.status not in ('approved','rejected')
  )                                                                      as overdue_tasks,
  count(t.*) filter (
    where t.status = 'approved'
      and t.deadline is not null
      and t.submitted_at is not null
      and t.submitted_at <= t.deadline
  )                                                                      as on_time_completed,
  count(t.*) filter (
    where t.status = 'approved'
      and t.deadline is not null
      and t.submitted_at is not null
      and t.submitted_at > t.deadline
  )                                                                      as late_completed,
  case
    when count(t.*) filter (where t.status = 'approved' and t.deadline is not null) = 0 then null
    else round(
      100.0
      * count(t.*) filter (
          where t.status = 'approved'
            and t.deadline is not null
            and t.submitted_at is not null
            and t.submitted_at <= t.deadline
        )
      / count(t.*) filter (where t.status = 'approved' and t.deadline is not null),
      1
    )
  end                                                                    as on_time_rate,
  case
    when count(t.*) filter (where t.status in ('approved','rejected')) = 0 then null
    else round(
      100.0
      * count(t.*) filter (where t.status = 'approved')
      / count(t.*) filter (where t.status in ('approved','rejected')),
      1
    )
  end                                                                    as approval_rate,
  case
    when count(t.*) = 0 then null
    else round(
      coalesce(
        case
          when count(t.*) filter (where t.status = 'approved' and t.deadline is not null) = 0 then 50.0
          else (
            100.0
            * count(t.*) filter (
                where t.status = 'approved'
                  and t.deadline is not null
                  and t.submitted_at is not null
                  and t.submitted_at <= t.deadline
              )
            / count(t.*) filter (where t.status = 'approved' and t.deadline is not null)
          )
        end * 0.5
        + case
            when count(t.*) filter (where t.status in ('approved','rejected')) = 0 then 50.0
            else (
              100.0
              * count(t.*) filter (where t.status = 'approved')
              / count(t.*) filter (where t.status in ('approved','rejected'))
            )
          end * 0.4
        + greatest(0, 10 - 5 * count(t.*) filter (
            where t.deadline is not null
              and t.deadline < now()
              and t.status not in ('approved','rejected')
          )),
        0
      ),
      1
    )
  end                                                                    as performance_score
from public.profiles p
left join public.tasks t on t.assigned_to = p.id
where p.role = 'employee'
group by p.id, p.full_name, p.email, p.department, p.is_active;

-- Allow authenticated users to query the view; RLS on the underlying tables
-- ensures employees only ever see aggregated rows that reference their own data
-- (admins can see everyone's row).
grant select on public.employee_performance to authenticated;
