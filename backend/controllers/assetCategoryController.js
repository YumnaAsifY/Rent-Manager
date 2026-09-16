const Asset = require('../models/Asset');
const AssetCategory = require('../models/AssetCategory');
const { toNameKey, toDisplayName } = require('../utils/categoryName');

const DEFAULT_CATEGORIES = ['House', 'Apartment', 'Shop', 'Plot'];

const serializeCategory = (category, counts = {}) => ({
  id: category._id.toString(),
  name: category.name,
  totalAssets: counts.total || 0,
  availableAssets: counts.available || 0,
  rentedAssets: counts.rented || 0,
  createdAt: category.createdAt,
});

const getAssetCountsByType = async () => {
  const rows = await Asset.aggregate([
    {
      $group: {
        _id: {
          $toLower: {
            $trim: { input: { $ifNull: ['$type', ''] } },
          },
        },
        total: { $sum: 1 },
        available: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Available'] }, 1, 0],
          },
        },
        rented: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Rented'] }, 1, 0],
          },
        },
      },
    },
  ]);

  return rows.reduce((acc, row) => {
    acc[row._id] = {
      total: row.total,
      available: row.available,
      rented: row.rented,
    };
    return acc;
  }, {});
};

const seedDefaultAssetCategories = async () => {
  for (let index = 0; index < DEFAULT_CATEGORIES.length; index += 1) {
    const name = DEFAULT_CATEGORIES[index];
    const nameKey = toNameKey(name);
    await AssetCategory.updateOne(
      { nameKey },
      {
        $setOnInsert: {
          name,
          nameKey,
          sortOrder: index + 1,
        },
      },
      { upsert: true }
    );
  }
};

const findValidCategoryName = async (type) => {
  const nameKey = toNameKey(type);
  if (!nameKey) {
    return null;
  }

  const category = await AssetCategory.findOne({ nameKey });
  return category ? category.name : null;
};

const getPublicAssetCategories = async (req, res) => {
  try {
    const categories = await AssetCategory.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return res.status(200).json({
      categories: categories.map((category) => ({
        id: category._id.toString(),
        name: category.name,
      })),
    });
  } catch (error) {
    console.error('Get public asset categories error:', error);
    return res.status(500).json({
      message: 'Server error while loading asset types',
    });
  }
};

const getAdminAssetCategories = async (req, res) => {
  try {
    const [categories, counts] = await Promise.all([
      AssetCategory.find().sort({ sortOrder: 1, name: 1 }),
      getAssetCountsByType(),
    ]);

    return res.status(200).json({
      categories: categories.map((category) =>
        serializeCategory(category, counts[category.nameKey] || {})
      ),
    });
  } catch (error) {
    console.error('Get admin asset categories error:', error);
    return res.status(500).json({
      message: 'Server error while loading asset categories',
    });
  }
};

const createAssetCategory = async (req, res) => {
  try {
    const displayName = toDisplayName(req.body.name);
    const nameKey = toNameKey(displayName);

    if (!nameKey) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existing = await AssetCategory.findOne({ nameKey });
    if (existing) {
      return res.status(400).json({
        message: 'This category already exists',
      });
    }

    const last = await AssetCategory.findOne().sort({ sortOrder: -1 }).lean();
    const category = await AssetCategory.create({
      name: displayName,
      nameKey,
      sortOrder: (last?.sortOrder || 0) + 1,
    });

    return res.status(201).json({
      message: 'Category added',
      category: serializeCategory(category),
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({
        message: 'This category already exists',
      });
    }

    console.error('Create asset category error:', error);
    return res.status(500).json({
      message: 'Server error while adding category',
    });
  }
};

const deleteAssetCategory = async (req, res) => {
  try {
    const category = await AssetCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const totalAssets = await Asset.countDocuments({
      $expr: {
        $eq: [
          { $toLower: { $trim: { input: { $ifNull: ['$type', ''] } } } },
          category.nameKey,
        ],
      },
    });

    if (totalAssets > 0) {
      return res.status(400).json({
        message: `Cannot delete. ${totalAssets} asset(s) use this type.`,
      });
    }

    await AssetCategory.deleteOne({ _id: category._id });

    return res.status(200).json({
      message: 'Category deleted',
    });
  } catch (error) {
    console.error('Delete asset category error:', error);
    return res.status(500).json({
      message: 'Server error while deleting category',
    });
  }
};

module.exports = {
  seedDefaultAssetCategories,
  findValidCategoryName,
  getPublicAssetCategories,
  getAdminAssetCategories,
  createAssetCategory,
  deleteAssetCategory,
};
