const Clause = require("../models/clauseSchema");
const ActivityLog = require("../models/ActivityLogSchema");

// Create Clause
exports.createClause = async (req, res) => {
  try {
    const { name, category, description, required } = req.body;

    const clause = await Clause.create({
      name,
      category,
      description,
      required: required || false,
      createdBy: req.user.id,
    });

    // Log the clause creation activity
    await ActivityLog.create({
      usr_id: req.user.id,
      type: 'clause_created',
      description: `Created clause: ${clause.name}`
    });

    // Emit notification to admins
    const io = req.app.get('io');
    if (io) {
      io.emit('clause-created', {
        clauseId: clause._id,
        clauseName: clause.name,
        createdBy: req.user.id,
        timestamp: new Date()
      });
    }

    res.status(201).json({ message: "Clause created", clause });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all clauses
// exports.getClauses = async (req, res) => {
//   try {
//     // Get page and limit from query params
//     const page = parseInt(req.query.page) || 1;  
//     const limit = parseInt(req.query.limit) || 10;  

//     // Calculate the number of items to skip
//     const skip = (page - 1) * limit;

   
//     // const clauses = await Clause.find()
//     //   .skip(skip)   
//     //   .limit(limit)   
//     //   .sort({ createdAt: -1 });  
//     const clauses = await Clause.find({ isCustom: false })
//   .skip(skip)
//   .limit(limit)
//   .sort({ createdAt: -1 });

 
//     const totalClauses = await Clause.countDocuments();

   
//     res.json({
//       clauses,
//       pagination: {
//         totalClauses,
//         currentPage: page,
//         totalPages: Math.ceil(totalClauses / limit),
//         limit,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };


exports.getClauses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1. Fetch all clauses
    const allClauses = await Clause.find().sort({ createdAt: -1 });

    // 2. Console log each clause's isCustom status
    console.log("📃 All Clauses:");
    allClauses.forEach((clause, i) => {
      console.log(`#${i + 1}: ${clause.name} | isCustom: ${clause.isCustom}`);
    });

    // 3. Filter in-memory where isCustom is explicitly false
    const filteredClauses = allClauses.filter((clause) => clause.isCustom === false);

    // 4. Paginate the filtered results
    const paginatedClauses = filteredClauses.slice(skip, skip + limit);

    // 5. Response
    console.log("🔍 Filter: isCustom === false");
    console.log("📄 Pagination - page:", page, "limit:", limit, "skip:", skip);
    console.log("📦 Total filtered:", filteredClauses.length);
    console.log("📂 Returning:", paginatedClauses.length, "clauses");

    res.json({
      clauses: paginatedClauses,
      pagination: {
        totalClauses: filteredClauses.length,
        currentPage: page,
        totalPages: Math.ceil(filteredClauses.length / limit),
        limit,
      },
    });
  } catch (err) {
    console.error("❌ Error in getClauses:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};







// Update Clause
exports.updateClause = async (req, res) => {
  try {
    const clause = await Clause.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!clause) return res.status(404).json({ message: "Clause not found" });
    res.json({ message: "Clause updated", clause });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Clause
exports.deleteClause = async (req, res) => {
  try {
    const clause = await Clause.findByIdAndDelete(req.params.id);
    if (!clause) return res.status(404).json({ message: "Clause not found" });
    res.json({ message: "Clause deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// Create Clause Variant
exports.createClauseVariant = async (req, res) => {
  try {
    const { clauseId, name, riskLevel, legalText, status, version } = req.body;

    // Find the clause by ID
    const clause = await Clause.findById(clauseId);
    if (!clause) return res.status(404).json({ message: "Clause not found" });

    // Add the new variant to the variants array
    clause.variants.push({
      name,
      riskLevel,
      legalText,
      status: status || "drafted", // Default to drafted
      version,
    });

    await clause.save();
    res.status(201).json({ message: "Clause variant added", clause });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all Clause Variants for a specific Clause
exports.getClauseVariants = async (req, res) => {
  try {
    const clause = await Clause.findById(req.params.id);
    if (!clause) return res.status(404).json({ message: "Clause not found" });

    res.json({ variants: clause.variants });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update Clause Variant
exports.updateClauseVariant = async (req, res) => {
  try {
    const { clauseId, variantId, name, riskLevel, legalText, status, version } = req.body;

    // Find the clause by ID
    const clause = await Clause.findById(clauseId);
    if (!clause) return res.status(404).json({ message: "Clause not found" });

    // Find the variant by its ID
    const variantIndex = clause.variants.findIndex((v) => v._id.toString() === variantId);
    if (variantIndex === -1) return res.status(404).json({ message: "Variant not found" });

    // Update the variant
    clause.variants[variantIndex] = {
      ...clause.variants[variantIndex], // Keep previous values
      name,
      riskLevel,
      legalText,
      status,
      version,
    };

    await clause.save();
    res.json({ message: "Clause variant updated", clause });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// Delete Clause Variant
exports.deleteClauseVariant = async (req, res) => {
  try {
    const { variantId } = req.params;

    // Find the clause that contains the variant
    const clause = await Clause.findOne({ "variants._id": variantId });
    if (!clause) return res.status(404).json({ message: "Clause not found" });

    // Find the variant index and remove it
    const variantIndex = clause.variants.findIndex((v) => v._id.toString() === variantId);
    if (variantIndex === -1) return res.status(404).json({ message: "Variant not found" });

    // Remove the variant from the variants array
    clause.variants.splice(variantIndex, 1);
    await clause.save();

    res.json({ message: "Clause variant deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
