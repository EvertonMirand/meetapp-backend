module.exports = {
  dialect: 'postgres',
  host: 'localhost',
  username: 'postgres',
  password: 'docker',
  database: 'Meetapp',
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
  },
};
