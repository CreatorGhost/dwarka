const revision =
  typeof __CHAPTER_ASSET_REVISION__ === "string" ? __CHAPTER_ASSET_REVISION__ : "source";

export function assetUrl(path) {
  const url = new URL(path, document.currentScript?.src || window.location.href);
  url.searchParams.set("v", revision);
  return url.href;
}

export const chapterAssetRevision = revision;

export const MODEL_URLS = {
  Vrishaketu_Composite: "./assets/models/Vrishaketu_Composite.glb",
  Raider_Archer_Composite: "./assets/models/Raider_Archer_Composite.glb",
  Brute_Composite: "./assets/models/Brute_Composite.glb",
  Male_Peasant_Composite: "./assets/models/Male_Peasant_Composite.glb",
  Female_Peasant_Composite: "./assets/models/Female_Peasant_Composite.glb",
  Wall_Plaster_Door_Round: "./assets/models/Wall_Plaster_Door_Round.glb",
  Wall_Plaster_Window_Wide_Round: "./assets/models/Wall_Plaster_Window_Wide_Round.glb",
  Wall_Plaster_Door_Flat: "./assets/models/Wall_Plaster_Door_Flat.glb",
  Wall_Plaster_Straight: "./assets/models/Wall_Plaster_Straight.glb",
  Door_2_Round: "./assets/models/Door_2_Round.glb",
  Door_4_Flat: "./assets/models/Door_4_Flat.glb",
  WindowShutters_Wide_Round_Open: "./assets/models/WindowShutters_Wide_Round_Open.glb",
  Wall_Arch: "./assets/models/Wall_Arch.glb",
  Kenney_roof_flat_square: "./assets/models/Kenney_roof_flat_square.glb",
  Kenney_column: "./assets/models/Kenney_column.glb",
  Kenney_column_wide: "./assets/models/Kenney_column_wide.glb",
  Kenney_pillar_wood: "./assets/models/Kenney_pillar_wood.glb",
  Prop_ExteriorBorder_Straight1: "./assets/models/Prop_ExteriorBorder_Straight1.glb",
  Prop_Support: "./assets/models/Prop_Support.glb",
  Overhang_Plaster_Long: "./assets/models/Overhang_Plaster_Long.glb",
  Overhang_Plaster_Short: "./assets/models/Overhang_Plaster_Short.glb",
  brass_diya_lantern: "./assets/models/brass_diya_lantern.glb",
  brass_vase_02: "./assets/models/brass_vase_02.glb",
  brass_vase_03: "./assets/models/brass_vase_03.glb",
  planter_pot_clay: "./assets/models/planter_pot_clay.glb",
  wicker_basket_01: "./assets/models/wicker_basket_01.glb",
  Bag: "./assets/models/Bag.glb",
  FarmCrate_Empty: "./assets/models/FarmCrate_Empty.glb",
  Vase_4: "./assets/models/Vase_4.glb",
  Rope_1: "./assets/models/Rope_1.glb",
  Banner_1_Cloth: "./assets/models/Banner_1_Cloth.glb",
  Banner_2_Cloth: "./assets/models/Banner_2_Cloth.glb",
  Kenney_tent_canvas: "./assets/models/Kenney_tent_canvas.glb",
  Kenney_stall_green: "./assets/models/Kenney_stall_green.glb",
  Kenney_fountain_round: "./assets/models/Kenney_fountain_round.glb",
  Kenney_fountain_center: "./assets/models/Kenney_fountain_center.glb",
  Kenney_cart: "./assets/models/Kenney_cart.glb",
  Kenney_wheel: "./assets/models/Kenney_wheel.glb",
  Bucket_Wooden_1: "./assets/models/Bucket_Wooden_1.glb",
  Prop_Wagon: "./assets/models/Prop_Wagon.glb",
  Balcony_Simple_Straight: "./assets/models/Balcony_Simple_Straight.glb",
  Stairs_Exterior_Straight: "./assets/models/Stairs_Exterior_Straight.glb",
  Stall_Cart_Empty: "./assets/models/Stall_Cart_Empty.glb",
  Stall_Empty: "./assets/models/Stall_Empty.glb",
  Barrel: "./assets/models/Barrel.glb",
  Vase_2: "./assets/models/Vase_2.glb",
  Pot_1: "./assets/models/Pot_1.glb",
  Sword_Bronze: "./assets/models/Sword_Bronze.glb",
  Banner_1: "./assets/models/Banner_1.glb",
  Lantern_Wall: "./assets/models/Lantern_Wall.glb",
  Crate_Wooden: "./assets/models/Crate_Wooden.glb",
  Bench: "./assets/models/Bench.glb",
  Prop_Crate: "./assets/models/Prop_Crate.glb",
  Prop_WoodenFence_Single: "./assets/models/Prop_WoodenFence_Single.glb",
};
