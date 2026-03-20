"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlannerDetails, PlannerSummary } from "@/types";

interface PlannerState {
  plans: PlannerSummary[];
  selectedPlan: PlannerDetails | null;
}

export function usePlanner() {
  const [state, setState] = useState<PlannerState>({ plans: [], selectedPlan: null });
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const load = useCallback(async (planId?: string) => {
    const query = planId ? `?planId=${encodeURIComponent(planId)}` : "";
    const response = await fetch(`/api/planner${query}`);
    const data = await response.json();
    if (response.ok) {
      setState({
        plans: data.plans ?? [],
        selectedPlan: data.selectedPlan ?? null
      });
    }
    return data;
  }, []);

  useEffect(() => {
    async function init() {
      const rememberedPlanId =
        typeof window !== "undefined" ? window.localStorage.getItem("studyos:selected-plan-id") : null;
      await load(rememberedPlanId ?? undefined);
      setBootstrapping(false);
    }
    void init();
  }, [load]);

  async function generate(payload: Record<string, unknown>) {
    setLoading(true);
    const response = await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    setLoading(false);

    if (response.ok) {
      if (typeof window !== "undefined" && data?.planId) {
        window.localStorage.setItem("studyos:selected-plan-id", data.planId);
      }
      setState((previous) => {
        const mergedPlans = [data.summary, ...previous.plans].filter(
          (plan, index, array) => array.findIndex((item) => item._id === plan._id) === index
        );

        return {
          plans: mergedPlans,
          selectedPlan: data.selectedPlan ?? null
        };
      });
    }

    return data;
  }

  async function selectPlan(planId: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("studyos:selected-plan-id", planId);
    }
    await load(planId);
  }

  async function removePlan(planId: string) {
    const response = await fetch("/api/planner", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId })
    });

    if (response.ok) {
      const remaining = state.plans.filter((plan) => plan._id !== planId);
      if (!remaining.length) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("studyos:selected-plan-id");
        }
        setState({ plans: [], selectedPlan: null });
      } else {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("studyos:selected-plan-id", remaining[0]._id);
        }
        await load(remaining[0]._id);
      }
    }

    return response.ok;
  }

  function updateSelectedPlan(next: PlannerDetails) {
    setState((previous) => ({
      plans: previous.plans.map((plan) =>
        plan._id === next._id
          ? {
              ...plan,
              name: next.name,
              createdAt: next.createdAt,
              startDate: next.startDate,
              examDate: next.examDate,
              hoursPerDay: next.hoursPerDay,
              subjects: next.subjects,
              totalDays: next.totalDays,
              totalTasks: next.totalTasks,
              completedTasks: next.completedTasks,
              completionRate: next.completionRate
            }
          : plan
      ),
      selectedPlan: next
    }));
  }

  return {
    plans: state.plans,
    selectedPlan: state.selectedPlan,
    plan: state.selectedPlan?.generatedPlan ?? [],
    loading,
    bootstrapping,
    load,
    generate,
    selectPlan,
    removePlan,
    updateSelectedPlan
  };
}
