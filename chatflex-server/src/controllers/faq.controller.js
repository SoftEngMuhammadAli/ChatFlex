const FAQ = require("../models/FAQ");

const listFaqs = async (req, res, next) => {
  try {
    const filter = { workspaceId: req.user.workspaceId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const faqs = await FAQ.find(filter).sort({ updatedAt: -1 });
    return res.json(faqs);
  } catch (error) {
    return next(error);
  }
};

const createFaq = async (req, res, next) => {
  try {
    const { question, answer, category = "general", status = "published" } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: "question and answer are required" });
    }

    const faq = await FAQ.create({
      workspaceId: req.user.workspaceId,
      question,
      answer,
      category,
      status
    });

    return res.status(201).json(faq);
  } catch (error) {
    return next(error);
  }
};

const updateFaq = async (req, res, next) => {
  try {
    const { faqId } = req.params;
    const updates = {};
    const allowedKeys = ["question", "answer", "category", "status"];
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    const faq = await FAQ.findOneAndUpdate(
      { _id: faqId, workspaceId: req.user.workspaceId },
      {
        $set: Object.fromEntries(
          Object.entries(updates).filter(([key]) => key !== "$inc")
        ),
        $inc: { version: 1 }
      },
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    return res.json(faq);
  } catch (error) {
    return next(error);
  }
};

const deleteFaq = async (req, res, next) => {
  try {
    const { faqId } = req.params;
    const deleted = await FAQ.findOneAndDelete({
      _id: faqId,
      workspaceId: req.user.workspaceId
    });

    if (!deleted) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const listPublicFaqs = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const faqs = await FAQ.find({
      workspaceId,
      status: "published"
    }).sort({ createdAt: -1 });

    return res.json(faqs);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  listPublicFaqs
};
