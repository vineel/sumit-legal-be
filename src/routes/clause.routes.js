const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { permit } = require("../middleware/role");
const controller = require("../controller/clause.controller");
const router = express.Router();

// can manage clauses
router.post("/addclause", authMiddleware, controller.createClause);
router.get("/getall", authMiddleware, controller.getClauses);
router.put("/updateclause/:id", authMiddleware, controller.updateClause);
router.delete("/deletecaluse/:id", authMiddleware, controller.deleteClause);

// Create a new clause variant
router.post("/addvariant", controller.createClauseVariant);
router.get("/:id/variants", controller.getClauseVariants);
router.put("/updatevariant", controller.updateClauseVariant);
router.delete("/variant/:variantId", controller.deleteClauseVariant);


module.exports = router;
