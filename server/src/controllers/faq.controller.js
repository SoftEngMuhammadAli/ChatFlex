import { FAQ } from "../models/faq.model.js";
import { catchAsyncHandler } from "../middleware/error.middleware.js";

const getWorkspaceContext = (req) => {
  const role = String(req.user?.role || "");
  const isSuperAdmin = role === "super-admin";
  const workspaceId = String(req.user?.workspaceId || "").trim();
  return { isSuperAdmin, workspaceId };
};

const ensureWorkspaceAccess = (req, res) => {
  const ctx = getWorkspaceContext(req);
  if (!ctx.isSuperAdmin && !ctx.workspaceId) {
    res.status(400).json({ message: "Workspace is required for this action" });
    return null;
  }
  return ctx;
};

const normalizeFaqStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "published") return "published";
  if (normalized === "disabled") return "disabled";
  if (normalized === "draft" || normalized === "unpublished") return "draft";
  return "published";
};

const FAQ_CSV_HEADERS = [
  "question",
  "answer",
  "category",
  "status",
  "order",
  "version",
];

const toCsvCell = (value) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const parseCsvRows = (rawCsv) => {
  const text = String(rawCsv || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if (char === "\n" && !inQuotes) {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }
  row.push(current);
  rows.push(row);
  return rows;
};

export const getSuperAdminFaqs = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const query = {};
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }
  const faqs = await FAQ.find(query).sort({ order: 1, createdAt: -1 });

  if (!faqs) {
    return res.status(404).json({ success: false, message: "No FAQs found" });
  }

  return res.status(200).json({
    success: true,
    data: faqs,
  });
});

export const createFaq = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const { question, answer, category, status } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      success: false,
      message: "Question and answer are required",
    });
  }

  const faq = await FAQ.create({
    question,
    answer,
    category,
    status: normalizeFaqStatus(status),
    workspaceId: ctx.isSuperAdmin ? undefined : ctx.workspaceId,
  });

  return res.status(201).json({
    success: true,
    message: "FAQ created successfully",
    data: faq,
  });
});

export const updateFaq = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const { id } = req.params;
  const updates = req.body;
  if (typeof updates?.status === "string") {
    updates.status = normalizeFaqStatus(updates.status);
  }
  if (!ctx.isSuperAdmin) {
    delete updates.workspaceId;
  }

  const query = { _id: id };
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }
  const faq = await FAQ.findOne(query);

  if (!faq) {
    return res.status(404).json({
      success: false,
      message: "FAQ not found",
    });
  }

  faq.versionHistory = [
    ...(Array.isArray(faq.versionHistory) ? faq.versionHistory : []),
    {
      version: Number(faq.version || 1),
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "",
      status: normalizeFaqStatus(faq.status),
      changedBy: req.user?._id || undefined,
      changedAt: new Date(),
    },
  ].slice(-100);

  Object.keys(updates || {}).forEach((key) => {
    faq[key] = updates[key];
  });
  faq.version = Number(faq.version || 1) + 1;
  await faq.save();

  return res.status(200).json({
    success: true,
    message: "FAQ updated successfully",
    data: faq,
  });
});

export const deleteFaq = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const { id } = req.params;
  const query = { _id: id };
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }
  const faq = await FAQ.findOneAndDelete(query);

  if (!faq) {
    return res.status(404).json({
      success: false,
      message: "FAQ not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "FAQ deleted successfully",
  });
});

// this is used to update the order of FAQs when they are dragged and dropped in the frontend
export const updateFaqOrder = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const { items } = req.body; // Array of { id, order }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({
      success: false,
      message: "Items array is required for reordering",
    });
  }

  // Use bulkWrite for efficient multiple updates
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: {
        _id: item.id,
        ...(!ctx.isSuperAdmin ? { workspaceId: ctx.workspaceId } : {}),
      },
      update: { order: item.order },
    },
  }));

  await FAQ.bulkWrite(bulkOps);

  return res.status(200).json({
    success: true,
    message: "FAQ order updated successfully",
  });
});

export const getFaqCategories = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const query = !ctx.isSuperAdmin ? { workspaceId: ctx.workspaceId } : {};
  const categories = await FAQ.distinct("category", query);

  if (!categories) {
    return res
      .status(404)
      .json({ success: false, message: "No categories found" });
  }

  return res.status(200).json({
    success: true,
    data: categories,
  });
});

export const getFaqById = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const { id } = req.params;
  const query = { _id: id };
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }
  const faq = await FAQ.findOne(query);

  if (!faq) {
    return res.status(404).json({
      success: false,
      message: "FAQ not found",
    });
  }
  return res.status(200).json({
    success: true,
    data: faq,
  });
});

export const getFaqByCategory = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const { category } = req.params;
  const faqs = await FAQ.find({
    category,
    ...(!ctx.isSuperAdmin ? { workspaceId: ctx.workspaceId } : {}),
  });

  if (!faqs || faqs.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No FAQs found for this category",
    });
  }
  return res.status(200).json({
    success: true,
    data: faqs,
  });
});

export const getPublishedFaqs = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const faqs = await FAQ.find({
    status: "published",
    ...(!ctx.isSuperAdmin ? { workspaceId: ctx.workspaceId } : {}),
  }).sort({ order: 1 });

  if (!faqs || faqs.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No published FAQs found",
    });
  }
  return res.status(200).json({
    success: true,
    data: faqs,
  });
});

export const getPublishedFaqsByCategory = catchAsyncHandler(
  async (req, res) => {
    const ctx = ensureWorkspaceAccess(req, res);
    if (!ctx) return;
    const { category } = req.params;
    const faqs = await FAQ.find({
      category,
      status: "published",
      ...(!ctx.isSuperAdmin ? { workspaceId: ctx.workspaceId } : {}),
    }).sort({ order: 1 });

    if (!faqs || faqs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No published FAQs found for this category",
      });
    }
    return res.status(200).json({
      success: true,
      data: faqs,
    });
  },
);

export const searchFaqs = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const queryText = String(req.query?.q || req.query?.query || "").trim();
  if (!queryText) {
    return res.status(400).json({
      success: false,
      message: "Search query is required",
    });
  }

  const faqs = await FAQ.find({
    ...(!ctx.isSuperAdmin ? { workspaceId: ctx.workspaceId } : {}),
    $or: [
      { question: { $regex: queryText, $options: "i" } },
      { answer: { $regex: queryText, $options: "i" } },
    ],
  }).sort({ order: 1 });

  if (!faqs || faqs.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No FAQs found matching the search query",
    });
  }
  return res.status(200).json({
    success: true,
    data: faqs,
    message: "FAQs found successfully",
  });
});

export const exportFaqCsv = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const query = {};
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }

  const faqs = await FAQ.find(query).sort({ order: 1, createdAt: -1 });
  const lines = [FAQ_CSV_HEADERS.join(",")];

  faqs.forEach((faq) => {
    lines.push(
      [
        faq.question,
        faq.answer,
        faq.category || "",
        normalizeFaqStatus(faq.status),
        Number(faq.order || 0),
        Number(faq.version || 1),
      ]
        .map(toCsvCell)
        .join(","),
    );
  });

  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="faqs.csv"');
  return res.status(200).send(csv);
});

export const importFaqCsv = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;

  const csvText = String(req.body?.csv || "").trim();
  if (!csvText) {
    return res.status(400).json({
      success: false,
      message: "CSV content is required in body.csv",
    });
  }

  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return res.status(400).json({
      success: false,
      message: "CSV must include a header row and at least one data row",
    });
  }

  const headers = rows[0].map((item) =>
    String(item || "")
      .trim()
      .toLowerCase(),
  );
  const col = (name) => headers.findIndex((header) => header === name);
  const questionIndex = col("question");
  const answerIndex = col("answer");
  const categoryIndex = col("category");
  const statusIndex = col("status");
  const orderIndex = col("order");

  if (questionIndex === -1 || answerIndex === -1) {
    return res.status(400).json({
      success: false,
      message: "CSV headers must include at least question and answer",
    });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const question = String(row[questionIndex] || "").trim();
    const answer = String(row[answerIndex] || "").trim();
    const category = String(
      categoryIndex >= 0 ? row[categoryIndex] || "" : "",
    ).trim();
    const status = normalizeFaqStatus(
      statusIndex >= 0 ? row[statusIndex] || "published" : "published",
    );
    const order = Number(orderIndex >= 0 ? row[orderIndex] : 0);

    if (!question || !answer) {
      skipped += 1;
      continue;
    }

    const query = {
      question,
      category,
      ...(!ctx.isSuperAdmin ? { workspaceId: ctx.workspaceId } : {}),
    };
    const existing = await FAQ.findOne(query);
    if (!existing) {
      await FAQ.create({
        question,
        answer,
        category,
        status,
        order: Number.isFinite(order) ? order : 0,
        workspaceId: ctx.isSuperAdmin ? undefined : ctx.workspaceId,
        version: 1,
      });
      created += 1;
      continue;
    }

    existing.versionHistory = [
      ...(Array.isArray(existing.versionHistory) ? existing.versionHistory : []),
      {
        version: Number(existing.version || 1),
        question: existing.question,
        answer: existing.answer,
        category: existing.category || "",
        status: normalizeFaqStatus(existing.status),
        changedBy: req.user?._id || undefined,
        changedAt: new Date(),
      },
    ].slice(-100);
    existing.answer = answer;
    existing.status = status;
    existing.order = Number.isFinite(order) ? order : existing.order;
    existing.version = Number(existing.version || 1) + 1;
    await existing.save();
    updated += 1;
  }

  return res.status(200).json({
    success: true,
    message: "FAQ CSV import completed",
    data: { created, updated, skipped },
  });
});

export const getFaqVersions = catchAsyncHandler(async (req, res) => {
  const ctx = ensureWorkspaceAccess(req, res);
  if (!ctx) return;
  const query = { _id: req.params.id };
  if (!ctx.isSuperAdmin) {
    query.workspaceId = ctx.workspaceId;
  }

  const faq = await FAQ.findOne(query).select(
    "question answer category status version versionHistory updatedAt createdAt",
  );
  if (!faq) {
    return res.status(404).json({
      success: false,
      message: "FAQ not found",
    });
  }

  const timeline = [
    ...(Array.isArray(faq.versionHistory) ? faq.versionHistory : []),
    {
      version: Number(faq.version || 1),
      question: faq.question,
      answer: faq.answer,
      category: faq.category || "",
      status: normalizeFaqStatus(faq.status),
      changedBy: req.user?._id || undefined,
      changedAt: faq.updatedAt || faq.createdAt || new Date(),
      isCurrent: true,
    },
  ];

  return res.status(200).json({
    success: true,
    data: {
      faqId: String(faq._id),
      versions: timeline,
    },
  });
});
