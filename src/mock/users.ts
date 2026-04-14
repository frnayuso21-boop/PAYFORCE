import type { User } from "@/types";

export const mockUsers: User[] = [
  {
    id:        "usr_01",
    name:      "Alejandro Ruiz",
    email:     "alejandro@payforce.dev",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alejandro",
    role:      "ADMIN",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id:        "usr_02",
    name:      "María González",
    email:     "maria@payforce.dev",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria",
    role:      "MERCHANT",
    createdAt: "2024-02-20T09:30:00Z",
    updatedAt: "2024-02-20T09:30:00Z",
  },
];

export const mockCurrentUser: User = mockUsers[0];
