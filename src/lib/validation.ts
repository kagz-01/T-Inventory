import { z } from "zod";

export const materialSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  description: z.string().optional(),
  stockOnHand: z.number().min(0).default(0),
  reorderThreshold: z.number().min(0).default(0),
});

export const vendorSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SOURCING", "BRANDING", "BOTH"]).default("SOURCING"),
  address: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const vendorMaterialSchema = z.object({
  vendorId: z.string(),
  materialId: z.string(),
  price: z.number().min(0),
  currency: z.string().default("USD"),
  quantityAvail: z.number().min(0).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1),
  materialId: z.string(),
  quantityNeeded: z.number().positive(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  projectId: z.string().optional(),
  assignedToId: z.string().optional(),
});

// Full pipeline: sourcing -> purchased -> branding -> distributed.
export const taskStatusUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "ASSIGNED",
    "SEARCHING",
    "REASSIGNED",
    "FOUND",
    "SAMPLE_COLLECTED",
    "AWAITING_APPROVAL",
    "PURCHASED",
    "BRANDING_IN_PROGRESS",
    "BRANDING_COMPLETE",
    "DISTRIBUTED",
    "UNAVAILABLE",
  ]),
  // Sourcing stage
  vendorId: z.string().optional(),
  quotedPrice: z.number().optional(),
  // Branding stage
  brandingVendorId: z.string().optional(),
  brandingMethod: z.string().optional(),
  brandingCost: z.number().optional(),
  artworkUrl: z.string().url().optional(),
  note: z.string().optional(),
});

export const distributionSchema = z.object({
  recipientName: z.string().min(1),
  recipientContact: z.string().optional(),
  quantity: z.number().positive(),
  deliveryDate: z.string().optional(), // ISO date string; defaults to now if omitted
  proofPhotoUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const reassignSchema = z.object({
  newAssigneeId: z.string(),
  reason: z.string().optional(),
});

export const employeeRoleUpdateSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
  active: z.boolean().optional(),
});

export const commentSchema = z.object({
  body: z.string().min(1),
});

export const inviteCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
});

export const organizationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  currency: z.string().min(1).optional(),
});
