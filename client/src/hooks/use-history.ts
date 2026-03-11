import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertPlayHistory } from "@shared/routes";

export function useHistory() {
  return useQuery({
    queryKey: [api.history.list.path],
    queryFn: async () => {
      const res = await fetch(api.history.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.history.list.responses[200].parse(await res.json());
    },
  });
}

export function useAddHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPlayHistory) => {
      const validated = api.history.create.input.parse(data);
      const res = await fetch(api.history.create.path, {
        method: api.history.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to add to history");
      return api.history.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.history.list.path] });
    },
  });
}
