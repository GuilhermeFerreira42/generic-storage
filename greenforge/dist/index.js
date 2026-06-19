/**
 * GreenForge Entry Point
 */
export const main = () => {
    console.log('GreenForge Initialized');
};
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=index.js.map