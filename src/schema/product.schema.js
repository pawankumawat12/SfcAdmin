import { z } from "zod";

export const productSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Product name must be at least 2 characters"),

    description: z
      .string()
      .trim()
      .max(5000, "Description is too long")
      .optional(),

    categoryId: z
      .string()
      .min(1, "Choose a category"),

    price: z.coerce
      .number()
      .positive("Price must be greater than zero"),

    availability_type: z
      .enum(["IN_STOCK", "MADE_TO_ORDER"])
      .default("IN_STOCK"),

    stock: z.coerce
      .number()
      .int()
      .min(0, "Stock cannot be negative")
      .optional(),

    status: z.enum(["Active", "Out of stock"]),

    imageFiles: z
      .array(z.instanceof(File))
      .max(5, "You can upload maximum 5 images.")
      .optional(),

    storeId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.availability_type === "IN_STOCK") {
      if (data.stock === undefined || data.stock === null || isNaN(data.stock)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Available stock is required for In Stock products",
          path: ["stock"],
        });
      }
    }
  });